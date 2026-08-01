import { afterEach, describe, expect, it, vi } from "vitest"
import type { FeedSource, NewsItem } from "@/lib/news"
import { loadFeedCached } from "@/lib/aggregate"
import { STALE_AFTER_HOURS, checkSourcesHealth } from "@/lib/health"

// The real loader reaches the network through Next's cache; the health report's
// logic is what is under test here, so the loader is replaced with one that
// resolves or rejects on command. vi.mock is hoisted above the imports.
vi.mock("@/lib/aggregate", () => ({ loadFeedCached: vi.fn() }))

const mockedLoad = vi.mocked(loadFeedCached)

const source = (name: string, category: FeedSource["category"]): FeedSource => ({
  name,
  url: `https://example.com/${name}.xml`,
  category,
})

const item = (hoursAgo: number): NewsItem => ({
  id: `id-${hoursAgo}`,
  title: "Manchete",
  description: "",
  url: `https://example.com/${hoursAgo}`,
  image: null,
  source: "Fonte",
  category: "Mundo",
  publishedAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
})

// Resolves each source in order with the given value, or rejects when the entry
// is an Error.
function respond(...outcomes: (NewsItem[] | Error)[]) {
  let call = 0
  mockedLoad.mockImplementation(async () => {
    const outcome = outcomes[call++]
    if (outcome instanceof Error) throw outcome
    return outcome
  })
}

afterEach(() => mockedLoad.mockReset())

describe("checkSourcesHealth", () => {
  it("reports every source as ok when all are fresh", async () => {
    respond([item(1)], [item(2)])
    const report = await checkSourcesHealth([source("A", "Mundo"), source("B", "Economia")])

    expect(report.status).toBe("ok")
    expect(report.ok).toBe(2)
    expect(report.down).toBe(0)
    expect(report.emptyCategories).toEqual([])
  })

  it("marks a rejected feed as down and keeps the reason without the source name", async () => {
    respond([item(1)], new Error("Feed B: 403"))
    const report = await checkSourcesHealth([source("A", "Mundo"), source("B", "Economia")])

    const b = report.sources.find((entry) => entry.name === "B")
    expect(b?.status).toBe("down")
    expect(b?.error).toBe("403")
    expect(report.status).toBe("degraded")
  })

  // A 200 that parses to nothing serves the reader exactly as much as a 403.
  it("treats a feed that parses to zero items as down", async () => {
    respond([])
    const report = await checkSourcesHealth([source("A", "Mundo")])

    expect(report.sources[0].status).toBe("down")
    expect(report.sources[0].error).toBe("feed sem itens")
  })

  it("marks a feed that still answers but stopped publishing as stale", async () => {
    respond([item(STALE_AFTER_HOURS + 5)])
    const report = await checkSourcesHealth([source("A", "Mundo")])

    expect(report.sources[0].status).toBe("stale")
    expect(report.stale).toBe(1)
    // Old news is still news, so this is not an outage.
    expect(report.status).toBe("ok")
  })

  it("does not call a feed stale while it is inside the window", async () => {
    respond([item(STALE_AFTER_HOURS - 5)])
    const report = await checkSourcesHealth([source("A", "Mundo")])
    expect(report.sources[0].status).toBe("ok")
  })

  it("reports down only when every source fails", async () => {
    respond(new Error("Feed A: 500"), new Error("Feed B: timeout"))
    const report = await checkSourcesHealth([source("A", "Mundo"), source("B", "Economia")])
    expect(report.status).toBe("down")
    expect(report.down).toBe(2)
  })

  // The reader-visible consequence of a dead feed is a category with nothing
  // in it, which is what makes this worth alerting on.
  it("names categories left without a single working source", async () => {
    respond([item(1)], new Error("Feed B: 403"), new Error("Feed C: 403"))
    const report = await checkSourcesHealth([
      source("A", "Mundo"),
      source("B", "Economia"),
      source("C", "Economia"),
    ])

    expect(report.emptyCategories).toEqual(["Economia"])
  })

  it("does not call a category empty while one of its sources still works", async () => {
    respond([item(1)], new Error("Feed B: 403"))
    const report = await checkSourcesHealth([source("A", "Economia"), source("B", "Economia")])
    expect(report.emptyCategories).toEqual([])
  })

  it("counts a stale source as still covering its category", async () => {
    respond([item(STALE_AFTER_HOURS + 10)])
    const report = await checkSourcesHealth([source("A", "Saúde")])
    expect(report.emptyCategories).toEqual([])
  })

  it("reports the age of the newest item, not the oldest", async () => {
    respond([item(50), item(3), item(20)])
    const report = await checkSourcesHealth([source("A", "Mundo")])
    expect(report.sources[0].newestAgeHours).toBeGreaterThan(2.9)
    expect(report.sources[0].newestAgeHours).toBeLessThan(3.1)
  })

  it("handles a feed whose items carry no date", async () => {
    respond([{ ...item(1), publishedAt: "" }])
    const report = await checkSourcesHealth([source("A", "Mundo")])
    // Undated but present: it has something to show, so it is not down.
    expect(report.sources[0].status).toBe("ok")
    expect(report.sources[0].newestAgeHours).toBeNull()
  })

  it("carries the source name and category through to the report", async () => {
    respond([item(1)])
    const report = await checkSourcesHealth([source("Agência Brasil", "Política")])
    expect(report.sources[0]).toMatchObject({ name: "Agência Brasil", category: "Política" })
    expect(report.total).toBe(1)
    expect(Number.isNaN(Date.parse(report.checkedAt))).toBe(false)
  })
})
