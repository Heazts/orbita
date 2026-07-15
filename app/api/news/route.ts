import { XMLParser } from "fast-xml-parser"
import { NextRequest, NextResponse } from "next/server"
import {
  FALLBACK_NEWS,
  FEED_SOURCES,
  inferCategory,
  plainText,
  stableId,
  type FeedSource,
  type NewsItem,
  type NewsResponse,
} from "@/lib/news"

export const revalidate = 300

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#text",
  processEntities: false,
})

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function textValue(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return textValue(record["#text"] ?? record._ ?? record["@_href"])
  }
  return ""
}

function findImage(item: Record<string, unknown>): string | null {
  const mediaItem = asArray(item["media:content"] ?? item["media:thumbnail"])[0]
  if (mediaItem && typeof mediaItem === "object") {
    const url = (mediaItem as Record<string, unknown>)["@_url"]
    if (typeof url === "string" && /^https?:\/\//.test(url)) return url
  }
  const enclosure = asArray(item.enclosure)[0]
  if (enclosure && typeof enclosure === "object") {
    const url = (enclosure as Record<string, unknown>)["@_url"]
    if (typeof url === "string") return url
  }
  const html = textValue(item.description ?? item["content:encoded"] ?? item.content)
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null
}

function findLink(item: Record<string, unknown>): string {
  if (typeof item.link === "string") return item.link
  for (const candidate of asArray(item.link)) {
    if (candidate && typeof candidate === "object") {
      const href = (candidate as Record<string, unknown>)["@_href"]
      if (typeof href === "string") return href
    }
  }
  return textValue(item.guid ?? item.id)
}

function parseFeed(xml: string, source: FeedSource, isGoogle = false): NewsItem[] {
  const document = parser.parse(xml) as Record<string, unknown>
  const rss = document.rss as Record<string, unknown> | undefined
  const channel = rss?.channel as Record<string, unknown> | undefined
  const feed = document.feed as Record<string, unknown> | undefined
  const rawItems = asArray((channel?.item ?? feed?.entry ?? document.item) as Record<string, unknown> | Record<string, unknown>[] | undefined)

  return rawItems.map((item): NewsItem | null => {
    const rawTitle = plainText(textValue(item.title))
    const url = findLink(item)
    if (!rawTitle || !/^https?:\/\//.test(url)) return null
    const googleSource = plainText(textValue(item.source))
    const title = isGoogle && googleSource ? rawTitle.replace(new RegExp(`\\s+-\\s+${googleSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), "") : rawTitle
    const rawDescription = textValue(item.description ?? item.summary ?? item["content:encoded"] ?? item.content)
    const rawDate = textValue(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"])
    const date = new Date(rawDate)
    return {
      id: stableId(url || title),
      title,
      description: plainText(rawDescription).slice(0, 300),
      url,
      image: findImage(item),
      source: googleSource || source.name,
      category: inferCategory(`${title} ${plainText(rawDescription)}`, source.category),
      publishedAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    }
  }).filter((item): item is NewsItem => Boolean(item))
}

async function loadFeed(source: FeedSource): Promise<NewsItem[]> {
  const response = await fetch(source.url, {
    headers: { "User-Agent": "Orbita-News/1.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`Feed ${source.name}: ${response.status}`)
  return parseFeed(await response.text(), source)
}

async function searchGoogle(query: string): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 Orbita-News/1.0" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Google News: ${response.status}`)
  return parseFeed(await response.text(), { name: "Google News", url, category: "Mundo" }, true)
}

function relevance(item: NewsItem, terms: string[]) {
  const title = item.title.toLocaleLowerCase("pt-BR")
  const body = `${item.description} ${item.source}`.toLocaleLowerCase("pt-BR")
  return terms.reduce((score, term) => score + (title.includes(term) ? 5 : 0) + (body.includes(term) ? 2 : 0), 0)
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query = plainText(params.get("q") ?? "").slice(0, 120)
  const category = plainText(params.get("category") ?? "Todas")
  const source = plainText(params.get("source") ?? "Todas")
  const period = ["1", "7", "30"].includes(params.get("period") ?? "") ? Number(params.get("period")) : 0
  const sort = params.get("sort") === "relevance" ? "relevance" : "latest"
  const feedResults = await Promise.allSettled(FEED_SOURCES.map(loadFeed))
  const localItems = feedResults.flatMap((result) => result.status === "fulfilled" ? result.value : [])
  let googleItems: NewsItem[] = []
  if (query) {
    try { googleItems = await searchGoogle(query) } catch { googleItems = [] }
  }
  const terms = query.toLocaleLowerCase("pt-BR").split(/\s+/).filter((term) => term.length > 1)
  const cutoff = period ? Date.now() - period * 86_400_000 : 0
  const combined = [...googleItems, ...localItems]
  const unique = Array.from(new Map(combined.map((item) => [item.url, item])).values())
    .filter((item) => !query || relevance(item, terms) > 0)
    .filter((item) => category === "Todas" || item.category === category)
    .filter((item) => source === "Todas" || item.source === source)
    .filter((item) => !cutoff || Date.parse(item.publishedAt) >= cutoff)
    .sort((a, b) => sort === "relevance" && query ? relevance(b, terms) - relevance(a, terms) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) : Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 100)

  const items = unique.length ? unique : query ? [] : FALLBACK_NEWS
  const payload: NewsResponse = {
    items,
    updatedAt: new Date().toISOString(),
    sourceCount: new Set(items.map((item) => item.source)).size,
    isFallback: !query && unique.length === 0,
  }
  return NextResponse.json(payload, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } })
}
