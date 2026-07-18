import { XMLParser } from "fast-xml-parser"
import {
  decodeEntities,
  inferCategory,
  normalize,
  plainText,
  type FeedSource,
  type NewsItem,
} from "@/lib/news"

const HTTPS_URL = /^https:\/\//i

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#text",
  processEntities: false,
})

export function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export function textValue(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return textValue(record["#text"] ?? record._ ?? record["@_href"])
  }
  return ""
}

// Reject site logos, badges, tracking pixels and SVGs that some feeds embed
// as the article image — they render as broken-looking thumbnails.
const DECORATIVE_IMAGE = /logo|sprite|placeholder|avatar|banner|badge|spacer|blank|pixel|1x1|feed|rss|\.svg(\?|$)/i

export function isUsableImage(url: unknown): url is string {
  return typeof url === "string" && HTTPS_URL.test(url) && !DECORATIVE_IMAGE.test(url)
}

export function findImage(item: Record<string, unknown>): string | null {
  const mediaItem = asArray(item["media:content"] ?? item["media:thumbnail"])[0]
  if (mediaItem && typeof mediaItem === "object") {
    const url = (mediaItem as Record<string, unknown>)["@_url"]
    if (isUsableImage(url)) return url
  }
  const enclosure = asArray(item.enclosure)[0]
  if (enclosure && typeof enclosure === "object") {
    const url = (enclosure as Record<string, unknown>)["@_url"]
    if (isUsableImage(url)) return url
  }
  // Decode double-encoded HTML, then take the first non-decorative <img>
  // (feeds often put their logo first).
  const rawHtml = textValue(item.description ?? item["content:encoded"] ?? item.content)
  const html = decodeEntities(decodeEntities(rawHtml))
  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    if (isUsableImage(match[1])) return match[1]
  }
  return null
}

export function findLink(item: Record<string, unknown>): string {
  if (typeof item.link === "string") return item.link
  for (const candidate of asArray(item.link)) {
    if (candidate && typeof candidate === "object") {
      const href = (candidate as Record<string, unknown>)["@_href"]
      if (typeof href === "string") return href
    }
  }
  return textValue(item.guid ?? item.id)
}

export function parseFeed(xml: string, source: FeedSource, isGoogle = false): NewsItem[] {
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
    // plainText runs two decode + tag-strip passes, so compute it once and
    // reuse it for both the snippet and category inference.
    const description = plainText(rawDescription)
    const rawDate = textValue(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"])
    const date = new Date(rawDate)
    return {
      // Safe to use directly: the guard above already requires a valid
      // http(s) url, and route.ts deduplicates items by url anyway — so it's
      // already the unique key, with none of the collision risk a hash has.
      id: url,
      title,
      description: description.slice(0, 300),
      url,
      image: findImage(item),
      source: googleSource || source.name,
      category: inferCategory(`${title} ${description}`, source.category),
      publishedAt: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    }
  }).filter((item): item is NewsItem => Boolean(item))
}

export function relevance(item: NewsItem, terms: string[]): number {
  const title = normalize(item.title)
  const body = normalize(`${item.description} ${item.source}`)
  return terms.reduce((score, term) => score + (title.includes(term) ? 5 : 0) + (body.includes(term) ? 2 : 0), 0)
}
