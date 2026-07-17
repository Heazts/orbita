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
import { clientIp, isRateLimited } from "@/lib/rate-limit"

export const revalidate = 300

// Cap the feed body we buffer so a pathological (or compromised) feed can't
// exhaust memory. The abort timeouts bound download time; this bounds size.
const MAX_FEED_BYTES = 5_000_000

async function readCapped(response: Response, maxBytes: number, label: string): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return response.text()
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

async function loadFeed(source: FeedSource): Promise<NewsItem[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Orbita-News/1.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`Feed ${source.name}: ${response.status}`)
  return parseFeed(await readCapped(response, MAX_FEED_BYTES, `Feed ${source.name}`), source)
}

async function searchGoogle(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 Orbita-News/1.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Google News: ${response.status}`)
  return parseFeed(await readCapped(response, MAX_FEED_BYTES, "Google News"), { name: "Google News", url, category: "Mundo" }, true)
}

export async function GET(request: NextRequest) {
  const clientId = clientIp(request)
  if (isRateLimited(clientId)) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": "60" } },
    )
  }
  const params = request.nextUrl.searchParams
  const query = plainText(params.get("q") ?? "").slice(0, 120)
  const category = plainText(params.get("category") ?? "Todas")
  const source = plainText(params.get("source") ?? "Todas")
  const period = ["1", "7", "30"].includes(params.get("period") ?? "") ? Number(params.get("period")) : 0
  const sort = params.get("sort") === "relevance" ? "relevance" : "latest"
  const feedResults = await Promise.allSettled(FEED_SOURCES.map(loadFeed))
  const localItems = feedResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  const failedSources = FEED_SOURCES
    .filter((_, index) => feedResults[index].status === "rejected")
    .map((feed) => feed.name)
  let googleItems: NewsItem[] = []
  if (query) {
    try { googleItems = await searchGoogle(query) } catch { googleItems = [] }
  }
  // Google already matched the query on its side, so keep every Google result;
  // only local feed items need the accent-insensitive relevance check. This
  // stops valid results from disappearing when the query omits accents.
  const googleUrls = new Set(googleItems.map((item) => item.url))
  const terms = normalize(query).split(/\s+/).filter((term) => term.length > 1)
  const cutoff = period ? Date.now() - period * 86_400_000 : 0
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
    ...(failedSources.length ? { failedSources } : {}),
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
}
