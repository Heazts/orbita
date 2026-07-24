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

const DECORATIVE_IMAGE = /logo|sprite|placeholder|avatar|banner|badge|spacer|blank|pixel|1x1|feed|rss|\.svg(\?|$)/i

export function isUsableImage(url: unknown): url is string {
  return typeof url === "string" && HTTPS_URL.test(url) && !DECORATIVE_IMAGE.test(url)
}

function getAttributeUrl(
  value: unknown,
): string | undefined {
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>)["@_url"]
    if (typeof url === "string") return url
  }
  return undefined
}

export function findImage(item: Record<string, unknown>): string | null {
  const mediaItem = asArray(item["media:content"] ?? item["media:thumbnail"])[0]
  const mediaUrl = getAttributeUrl(mediaItem)
  if (mediaUrl && isUsableImage(mediaUrl)) return mediaUrl

  const enclosure = asArray(item.enclosure)[0]
  const enclosureUrl = getAttributeUrl(enclosure)
  if (enclosureUrl && isUsableImage(enclosureUrl)) return enclosureUrl

  const rawHtml = textValue(item.description ?? item["content:encoded"] ?? item.content)
  const html = decodeEntities(decodeEntities(rawHtml))
  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    if (isUsableImage(match[1])) return match[1]
  }
  return null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function findLink(item: Record<string, unknown>): string {
  if (typeof item.link === "string") return item.link.trim()
  for (const candidate of asArray(item.link)) {
    if (isObject(candidate)) {
      const href = candidate["@_href"]
      if (typeof href === "string") return href.trim()
    }
  }
  return textValue(item.guid ?? item.id).trim()
}

type RssFeed = {
  rss?: Record<string, unknown>
  feed?: Record<string, unknown>
  item?: Record<string, unknown> | Record<string, unknown>[]
}

export function parseFeed(xml: string, source: FeedSource, isGoogle = false): NewsItem[] {
  const document = parser.parse(xml) as RssFeed
  const rss = document.rss
  const channel = rss?.channel as Record<string, unknown> | undefined
  const feed = document.feed
  const rawItems = asArray(
    (channel?.item ?? feed?.entry ?? document.item) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined,
  )

  return rawItems
    .map((item): NewsItem | null => {
      const rawTitle = plainText(textValue(item.title))
      const url = findLink(item)
      if (!rawTitle || !/^https:\/\//.test(url)) return null

      const trimmedUrl = url.trim()
      if (!HTTPS_URL.test(trimmedUrl)) return null

      const safeUrl = trimmedUrl

      const googleSource = plainText(textValue(item.source))
      const title =
        isGoogle && googleSource
          ? rawTitle.replace(
              new RegExp(
                `\\s+-\\s+${googleSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              ),
              "",
            )
          : rawTitle

      const rawDescription = textValue(
        item.description ?? item.summary ?? item["content:encoded"] ?? item.content,
      )
      const description = plainText(rawDescription)
      const rawDate = textValue(
        item.pubDate ?? item.published ?? item.updated ?? item["dc:date"],
      )
      const date = new Date(rawDate)

      return {
        id: safeUrl,
        title,
        description: description.slice(0, 300),
        url: safeUrl,
        image: findImage(item),
        source: googleSource || source.name,
        category: inferCategory(`${title} ${description}`, source.category),
        // Empty string when the feed gives no parseable date. Fabricating
        // new Date() here would make undated items masquerade as fresh: they'd
        // always pass the "ao vivo" 2h cutoff, always show the "Novo" badge, and
        // sort above genuinely recent news. Consumers treat "" as "unknown time"
        // (sorts last, never counts as live/new) instead.
        publishedAt: Number.isNaN(date.getTime()) ? "" : date.toISOString(),
      }
    })
    .filter((item): item is NewsItem => Boolean(item))
}

export function relevance(item: NewsItem, terms: string[]): number {
  const title = normalize(item.title)
  const body = normalize(`${item.description} ${item.source}`)
  return terms.reduce(
    (score, term) =>
      score + (title.includes(term) ? 5 : 0) + (body.includes(term) ? 2 : 0),
    0,
  )
}
