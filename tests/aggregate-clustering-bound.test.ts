import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
// vitest hoists the vi.mock calls below above these imports.
import { DEFAULT_NEWS_QUERY, aggregateNews } from "@/lib/aggregate"
import { FEED_SOURCES } from "@/lib/news"

/**
 * Clustering compares each item against every cluster built so far. When
 * headlines are mostly distinct — the ordinary case — almost every item becomes
 * its own cluster and the pass is quadratic in its input. Measured against the
 * real implementation: 135ms at 1000 items, 578ms at 2000, on the request path,
 * blocking the event loop for every other request sharing the instance. The 23
 * feeds together return roughly 900-1400.
 *
 * aggregateNews now bounds what reaches that pass. This test guards the bound
 * itself rather than a timing threshold, which would be flaky on shared CI.
 */

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

const clusterInputSizes: number[] = []

vi.mock("@/lib/clustering", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clustering")>()
  return {
    ...actual,
    // Delegates to the real implementation — this records the input size, it
    // does not replace the behaviour under test.
    toClusteredItems: (items: Parameters<typeof actual.toClusteredItems>[0], threshold?: number) => {
      clusterInputSizes.push(items.length)
      return actual.toClusteredItems(items, threshold)
    },
  }
})


/**
 * A feed of `count` items whose headlines share no vocabulary at all.
 *
 * Every token has to be longer than three characters and must not repeat across
 * items, because lib/clustering.ts drops shorter words before comparing. A first
 * draft of this generator varied only a short numeric suffix, which was filtered
 * out — leaving every headline with an identical token set, collapsing all 2300
 * items into a single cluster and testing the cheapest case instead of the
 * expensive one. No shared tokens means no merges, which is the worst case for
 * the quadratic pass and the one the bound exists for.
 */
function bigFeed(sourceIndex: number, count: number): string {
  const now = Date.now()
  const items = Array.from({ length: count }, (_, i) => {
    const id = `${sourceIndex}z${i}`
    const title = Array.from({ length: 8 }, (_, k) => `termo${id}z${k}`).join(" ")
    return `<item>
      <title>${title}</title>
      <link>https://example.com/${id}</link>
      <pubDate>${new Date(now - i * 60_000).toUTCString()}</pubDate>
    </item>`
  }).join("")
  return `<?xml version="1.0"?><rss version="2.0"><channel>${items}</channel></rss>`
}

beforeEach(() => {
  clusterInputSizes.length = 0
  let call = 0
  vi.stubGlobal("fetch", async () => {
    const body = bigFeed(call, 100)
    call += 1
    return new Response(body, { status: 200, headers: { "Content-Type": "application/xml" } })
  })
})

afterEach(() => vi.unstubAllGlobals())

describe("aggregateNews bounds the clustering input", () => {
  it("does not hand the whole multi-feed haul to the quadratic pass", async () => {
    await aggregateNews(DEFAULT_NEWS_QUERY)

    expect(clusterInputSizes).toHaveLength(1)
    // 23 sources x 100 items is what actually arrives; only a bounded head of it
    // may reach clustering.
    expect(clusterInputSizes[0]).toBeLessThanOrEqual(300)
  })

  it("still fills the 100-item list from that bounded head", async () => {
    // The bound has to leave room for the list plus margin for dedup, otherwise
    // it would be trading a real feature for the speed-up.
    const result = await aggregateNews(DEFAULT_NEWS_QUERY)
    expect(result.items).toHaveLength(100)
  })

  it("would otherwise have been handed far more than the bound", async () => {
    // Negative control: confirms the feeds in this test really do produce an
    // input large enough for the bound to matter, so the assertion above is not
    // passing simply because there was never much to cluster.
    expect(FEED_SOURCES.length * 100).toBeGreaterThan(300 * 2)
  })
})
