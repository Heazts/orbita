import { unstable_cache } from "next/cache"
import {
  FEED_SOURCES,
  curateHomepage,
  normalize,
  type FeedSource,
  type NewsItem,
  type NewsResponse,
} from "@/lib/news"
import { parseFeed, relevance } from "@/lib/parse"
import { toClusteredItems } from "@/lib/clustering"
import type { Sort } from "@/lib/types"

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
    redirect: "follow",
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!response.ok) throw new Error(`${label}: ${response.status}`)
  return readCapped(response, MAX_FEED_BYTES, label)
}

// Caches the *parsed* items, not just the HTTP response: Next's fetch cache
// (above) only saves repeated network I/O. Without this, the XML parse
// itself still reran on every request within the revalidate window. Shared
// across every caller (the /api/news route and the home page's server
// render both hit this same cache key).
export const loadFeedCached = unstable_cache(
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

/**
 * Key two links are "the same story" under.
 *
 * Only the scheme and host are case-insensitive in a URL, so those are lowered
 * and the path and query are left exactly as the feed published them. Comparing
 * the raw string treated HTTPS://x and https://x as two separate stories.
 *
 * This is used for the key alone — never to rewrite the item. `item.url` is also
 * `item.id`, which is the key favourites are stored under in the reader's
 * browser, so normalising the item itself would orphan every saved favourite.
 */
export function dedupeKey(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol.toLowerCase()}//${parsed.host.toLowerCase()}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export type NewsQuery = {
  query: string
  category: string
  source: string
  period: "live" | number
  sort: Sort
}

export const DEFAULT_NEWS_QUERY: NewsQuery = {
  query: "",
  category: "Todas",
  source: "Todas",
  period: 0,
  sort: "latest",
}

/**
 * Fetches every feed plus (optionally) Google News, dedupes/clusters
 * equivalent coverage, filters/sorts, and — for the untouched homepage view —
 * applies the tone/diversity curation. Shared by app/api/news/route.ts (the
 * client's SWR endpoint) and app/page.tsx (the server-rendered first paint),
 * so both read from the same 5-minute cache instead of duplicating fetches.
 */
export async function aggregateNews({ query, category, source, period, sort }: NewsQuery): Promise<NewsResponse> {
  // Local feeds and the Google search run concurrently — running them in
  // sequence would add Google's own timeout on top of the slowest feed's
  // instead of overlapping it.
  const [feedResults, googleItems] = await Promise.all([
    Promise.allSettled(FEED_SOURCES.map(loadFeedCached)),
    query ? searchGoogle(query).catch(() => [] as NewsItem[]) : Promise.resolve([] as NewsItem[]),
  ])
  const localItems = feedResults.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  const failedSources = FEED_SOURCES.filter((_, index) => feedResults[index].status === "rejected").map(
    (feed) => feed.name,
  )

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
  const sorted = Array.from(new Map(combined.map((item) => [dedupeKey(item.url), item])).values())
    .map((item) => {
      // Undated items (publishedAt === "") parse to NaN; map that to -Infinity so
      // they sort last under "mais recentes" and never satisfy the live/period
      // cutoff (an unknown date can't be claimed to be within the last 2h/24h).
      const parsed = Date.parse(item.publishedAt)
      return { item, score: query ? relevance(item, terms) : 0, time: Number.isNaN(parsed) ? -Infinity : parsed }
    })
    .filter(({ item, score }) => !query || googleUrls.has(item.url) || score > 0)
    .filter(({ item }) => category === "Todas" || item.category === category)
    .filter(({ item }) => source === "Todas" || item.source === source)
    .filter(({ time }) => !cutoff || time >= cutoff)
    .sort((a, b) => (byRelevance ? b.score - a.score || b.time - a.time : b.time - a.time))
    .map(({ item }) => item)

  // Collapse the same story reported by different outlets under different
  // URLs/headlines (exact-URL dedup above only catches identical links) before
  // capping the list, so the 100-item limit isn't spent on duplicates.
  const clustered = toClusteredItems(sorted)
  const unique = clustered.slice(0, 100)

  // Only the untouched homepage view gets tone/diversity curation. The moment
  // the reader searches, picks a category/source/period or goes live, we honor
  // their intent and keep the pure chronological/relevance order above.
  const isDefaultView =
    !query && category === "Todas" && source === "Todas" && period === 0 && sort === "latest"
  const items = isDefaultView ? curateHomepage(unique) : unique

  return {
    items,
    updatedAt: new Date().toISOString(),
    sourceCount: new Set(items.map((item) => item.source)).size,
    // Nothing to show *and* something went wrong upstream. Distinguishes an
    // outage from a filter that simply matched nothing, so the reader is told
    // which of the two it is instead of being handed invented headlines.
    sourcesUnavailable: items.length === 0 && failedSources.length > 0,
    ...(isLivePeriod && !query ? { isLive: true } : {}),
    ...(failedSources.length ? { failedSources } : {}),
  }
}
