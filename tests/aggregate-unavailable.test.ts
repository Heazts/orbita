import { afterEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_NEWS_QUERY, aggregateNews } from "@/lib/aggregate"
import { FEED_SOURCES } from "@/lib/news"

// unstable_cache wraps the loader in Next's request-scoped cache, which does not
// exist outside a server render. Passing the function through keeps the
// aggregation logic identical while making it callable from a test. vi.mock is
// hoisted above the imports.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function feedXml(title: string, link: string, description = ""): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel>
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${new Date().toUTCString()}</pubDate>
    </item>
  </channel></rss>`
}

/** Every outbound feed request fails with the given status. */
function allSourcesFail(status = 403) {
  vi.stubGlobal("fetch", async () => new Response(null, { status }))
}

describe("aggregateNews when every source fails", () => {
  it("returns no items at all, rather than invented ones", async () => {
    allSourcesFail()
    const result = await aggregateNews(DEFAULT_NEWS_QUERY)

    // The old behaviour substituted four fabricated articles here, attributed
    // to real outlets and stamped with the current time.
    expect(result.items).toEqual([])
    expect(result.sourceCount).toBe(0)
  })

  it("says the sources are unavailable, so the UI can tell an outage from a filter", async () => {
    allSourcesFail()
    const result = await aggregateNews(DEFAULT_NEWS_QUERY)

    expect(result.sourcesUnavailable).toBe(true)
    expect(result.failedSources).toHaveLength(FEED_SOURCES.length)
  })

  it("no longer reports a fallback flag nothing ever read", async () => {
    allSourcesFail()
    const result = await aggregateNews(DEFAULT_NEWS_QUERY)
    expect("isFallback" in result).toBe(false)
  })
})

describe("aggregateNews when sources work", () => {
  it("does not claim the sources are unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      async (input: string | URL) =>
        new Response(feedXml("Manchete real", `https://example.com/${encodeURIComponent(String(input))}`), {
          status: 200,
        }),
    )

    const result = await aggregateNews(DEFAULT_NEWS_QUERY)
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.sourcesUnavailable).toBe(false)
    expect(result.failedSources).toBeUndefined()
  })

  it("emits only server-signed image proxy URLs", async () => {
    vi.stubEnv("IMAGE_PROXY_SECRET", "test-image-secret")
    vi.stubGlobal(
      "fetch",
      async (input: string | URL) =>
        new Response(
          feedXml(
            "Manchete com foto",
            `https://example.com/${encodeURIComponent(String(input))}`,
            '&lt;img src="https://cdn.example.com/photo.jpg"&gt;',
          ),
          { status: 200 },
        ),
    )

    const result = await aggregateNews(DEFAULT_NEWS_QUERY)
    expect(result.items.some((item) => item.image?.startsWith("/api/img-proxy?url=") && item.image.includes("sig="))).toBe(true)
    expect(result.items.every((item) => !item.image?.startsWith("https://"))).toBe(true)
  })

  // An empty result for a search is the reader's filter, not an outage, and
  // must not trigger the "we are broken" state.
  it("does not claim unavailability when a search simply matches nothing", async () => {
    // Local feeds answer normally with headlines that do not match the query,
    // and Google finds nothing either — so the empty result is the search, not
    // an outage.
    vi.stubGlobal("fetch", async (input: string | URL) => {
      const url = String(input)
      // Matched on the exact host rather than a substring: "news.google.com"
      // can appear anywhere in a URL — as a path or a query parameter — so
      // `includes` would route the wrong request here.
      if (new URL(url).hostname === "news.google.com") {
        return new Response(`<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`, {
          status: 200,
        })
      }
      return new Response(feedXml("Manchete real", `https://example.com/${encodeURIComponent(url)}`), {
        status: 200,
      })
    })

    const result = await aggregateNews({
      ...DEFAULT_NEWS_QUERY,
      query: "termoquenaoexisteemlugarnenhum",
    })
    expect(result.items).toEqual([])
    expect(result.failedSources).toBeUndefined()
    expect(result.sourcesUnavailable).toBe(false)
  })
})
