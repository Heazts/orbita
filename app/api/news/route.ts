import { unstable_cache } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import {
  FALLBACK_NEWS,
  FEED_SOURCES,
  normalize,
  plainText,
  type FeedSource,
  type NewsItem,
  type NewsResponse,
} from "@/lib/news"
import { parseFeed, relevance } from "@/lib/parse"
import { RATE_LIMIT_MAX_REQUESTS, checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

export const revalidate = 300

// Cap the feed body we buffer so a pathological (or compromised) feed can't
// exhaust memory. The abort timeouts bound download time; this bounds size.
const MAX_FEED_BYTES = 5_000_000

async function readCapped(response: Response, maxBytes: number, label: string): Promise<string> {
  const reader = response.body?.getReader()
  // No streaming body available (shouldn't happen with Node's fetch/undici):
  // fail rather than silently falling back to an unbounded response.text().
  if (!reader) throw new Error(`${label}: streaming body unavailable, refusing unbounded read`)
  const decoder = new TextDecoder()
  let text = ""
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`${label}: response exceeds ${maxBytes} bytes`)
    }
    // stream: true keeps multi-byte characters that straddle chunk boundaries intact.
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

async function fetchFeed(url: string, userAgent: string, timeoutMs: number, label: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`${label}: ${response.status}`)
  return readCapped(response, MAX_FEED_BYTES, label)
}

// Caches the *parsed* items, not just the HTTP response: Next's fetch cache
// (above) only saves repeated network I/O. Without this, the XML parse
// itself still reran on every request within the revalidate window.
const loadFeedCached = unstable_cache(
  async (source: FeedSource): Promise<NewsItem[]> =>
    parseFeed(await fetchFeed(source.url, "Orbita-News/1.0", 8_000, `Feed ${source.name}`), source),
  ["orbita-feed"],
  { revalidate: 300 },
)

async function searchGoogle(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
  const xml = await fetchFeed(url, "Mozilla/5.0 Orbita-News/1.0", 10_000, "Google News")
  return parseFeed(xml, { name: "Google News", url, category: "Mundo" }, true)
}

export async function GET(request: NextRequest) {
  const clientId = clientIp(request)
  // Uses Upstash Redis for a cross-instance limit when configured, otherwise
  // falls back to the per-instance in-memory counter.
  const rate = await checkRateLimitDistributed(clientId)
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(rate.remaining),
  }
  if (rate.limited) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { ...rateHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }
  const params = request.nextUrl.searchParams
  const query = plainText(params.get("q") ?? "").slice(0, 120)
  const category = plainText(params.get("category") ?? "Todas")
  const source = plainText(params.get("source") ?? "Todas")
  const period = params.get("live") === "true" ? "live" : ["1", "7", "30"].includes(params.get("period") ?? "") ? Number(params.get("period")) : 0
  const sort = params.get("sort") === "relevance" ? "relevance" : "latest"

  // Local feeds and the Google search run concurrently — previously the
  // Google request only started after every local feed had settled, adding
  // its own timeout on top of the slowest feed's instead of overlapping it.
  const [feedResults, googleItems] = await Promise.all([
    Promise.allSettled(FEED_SOURCES.map(loadFeedCached)),
    query ? searchGoogle(query).catch(() => [] as NewsItem[]) : Promise.resolve([] as NewsItem[]),
  ])
  const localItems = feedResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  const failedSources = FEED_SOURCES
    .filter((_, index) => feedResults[index].status === "rejected")
    .map((feed) => feed.name)

  // Google already matched the query on its side, so keep every Google result;
  // only local feed items need the accent-insensitive relevance check. This
  // stops valid results from disappearing when the query omits accents.
  const googleUrls = new Set(googleItems.map((item) => item.url))
  const terms = normalize(query).split(/\s+/).filter((term) => term.length > 1)
  const isLivePeriod = period === "live"
  const cutoffHours = isLivePeriod ? 2 : typeof period === "number" ? period * 24 : 0
  const cutoff = cutoffHours ? Date.now() - cutoffHours * 3_600_000 : 0
  const byRelevance = sort === "relevance" && query.length > 0
  const combined = [...googleItems, ...localItems]

  // Score and parse each item once, then filter/sort on the precomputed values
  // instead of recomputing relevance() inside the sort comparator.
  const unique = Array.from(new Map(combined.map((item) => [item.url, item])).values())
    .map((item) => ({ item, score: query ? relevance(item, terms) : 0, time: Date.parse(item.publishedAt) }))
    .filter(({ item, score }) => !query || googleUrls.has(item.url) || score > 0)
    .filter(({ item }) => category === "Todas" || item.category === category)
    .filter(({ item }) => source === "Todas" || item.source === source)
    .filter(({ time }) => !cutoff || time >= cutoff)
    .sort((a, b) => (byRelevance ? b.score - a.score || b.time - a.time : b.time - a.time))
    .slice(0, 100)
    .map(({ item }) => item)

  const items = unique.length ? unique : query ? [] : FALLBACK_NEWS
  const payload: NewsResponse = {
    items,
    updatedAt: new Date().toISOString(),
    sourceCount: new Set(items.map((item) => item.source)).size,
    isFallback: !query && unique.length === 0,
    ...(isLivePeriod && !query ? { isLive: true } : {}),
    ...(failedSources.length ? { failedSources } : {}),
  }
  return NextResponse.json(payload, {
    headers: { ...rateHeaders, "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  })
}
