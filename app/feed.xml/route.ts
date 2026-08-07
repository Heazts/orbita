import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"
import { aggregateNewsCached, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"
import { escapeXml } from "@/lib/xml"

// This one genuinely is static — a route handler, not a page under the layout
// that reads the nonce — so revalidate applies here as written.
export const revalidate = 300

export async function GET() {
  // Same query as the home page, so the cached aggregate is shared rather than
  // computed a second time on its own schedule.
  const { items } = await aggregateNewsCached(DEFAULT_NEWS_QUERY)

  const itemsXml = items
    .slice(0, 50)
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <description>${escapeXml(item.description)}</description>
      <category>${escapeXml(item.category)}</category>
      <source url="${escapeXml(item.url)}">${escapeXml(item.source)}</source>
      ${item.publishedAt ? `<pubDate>${new Date(item.publishedAt).toUTCString()}</pubDate>` : ""}
    </item>`,
    )
    .join("")

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)} — Feed de Notícias</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <language>pt-BR</language>
    <atom:link href="${escapeXml(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`

  return new Response(rssXml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  })
}
