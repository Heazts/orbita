import { XMLParser } from "fast-xml-parser"
import {
  decodeEntities,
  inferCategory,
  normalize,
  plainText,
  truncate,
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
  // Repeated elements / mixed content come through as arrays (e.g. a
  // description split around inline tags). Flatten and join them instead of
  // dropping everything but the first node.
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join(" ")
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    // Prefer explicit text/CDATA, then an Atom href.
    const direct = record["#text"] ?? record._ ?? record["@_href"]
    if (direct !== undefined) return textValue(direct)
    // No direct text node: this is a mixed-content wrapper like
    // "Texto <b>importante</b> aqui". Concatenate the text of its children so
    // the sentence survives — and so an object never reaches a template literal
    // as the literal string "[object Object]".
    const parts: string[] = []
    for (const key of Object.keys(record)) {
      if (key.startsWith("@_")) continue
      const child = textValue(record[key])
      if (child) parts.push(child)
    }
    return parts.join(" ")
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
  const lower = html.toLowerCase()
  let offset = 0
  while (offset < html.length) {
    const tagStart = lower.indexOf("<img", offset)
    if (tagStart < 0) break
    const tagEnd = lower.indexOf(">", tagStart + 4)
    // An unclosed tag consumes the rest of the HTML. Stop once instead of
    // restarting a regex at every later <img prefix and rescanning the suffix.
    if (tagEnd < 0) break

    let cursor = tagStart + 4
    while (cursor < tagEnd) {
      while (cursor < tagEnd && (/\s/.test(html[cursor]) || html[cursor] === "/")) cursor += 1
      const nameStart = cursor
      while (cursor < tagEnd && !/[\s=/>]/.test(html[cursor])) cursor += 1
      if (cursor === nameStart) {
        cursor += 1
        continue
      }
      const name = lower.slice(nameStart, cursor)
      while (cursor < tagEnd && /\s/.test(html[cursor])) cursor += 1
      if (html[cursor] !== "=") continue
      cursor += 1
      while (cursor < tagEnd && /\s/.test(html[cursor])) cursor += 1
      const quote = html[cursor]
      if (quote !== '"' && quote !== "'") continue
      const valueStart = cursor + 1
      const valueEnd = html.indexOf(quote, valueStart)
      if (valueEnd < 0 || valueEnd > tagEnd) break
      if (name === "src") {
        const candidate = html.slice(valueStart, valueEnd)
        if (isUsableImage(candidate)) return candidate
      }
      cursor = valueEnd + 1
    }
    offset = tagEnd + 1
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
      if (
        !rawTitle ||
        /^https?:\/\//i.test(rawTitle) ||
        /^(?:clique aqui|leia mais|saiba mais|confira|sem título)$/i.test(rawTitle)
      ) {
        return null
      }
      // findLink already trims; HTTPS-only, so a feed can never hand us a
      // javascript: or data: URL to put in an href.
      const safeUrl = findLink(item)
      if (!HTTPS_URL.test(safeUrl)) return null

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
        description: truncate(description, 220),
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
