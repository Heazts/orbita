import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import * as news from "@/lib/news"
import { FEED_SOURCES } from "@/lib/news"

/**
 * A guard against re-introducing fabricated articles.
 *
 * lib/news/sources.ts used to export four invented headlines attributed to BBC
 * Brasil, Agência Brasil, Olhar Digital and NASA, timestamped with the current
 * time and linking to those outlets' home pages. They were rendered as ordinary
 * cards whenever every feed failed, so the site published news nobody wrote at
 * exactly the moment it was least able to notice.
 */
describe("no invented articles", () => {
  it("exports no placeholder article list", () => {
    expect("FALLBACK_NEWS" in news).toBe(false)
  })

  // The source list is the one place a fake article could be reintroduced and
  // still look like configuration.
  it("keeps the source list free of article-shaped data", () => {
    const file = readFileSync(new URL("../lib/news/sources.ts", import.meta.url), "utf8")
    for (const field of ["publishedAt", "description:", "image:"]) {
      expect(file).not.toContain(field)
    }
  })

  it("declares only feed sources, each with a real feed URL", () => {
    for (const source of FEED_SOURCES) {
      expect(Object.keys(source).sort()).toEqual(["category", "name", "url"])
      expect(source.url).toMatch(/^https:\/\//)
    }
  })
})

describe("category coverage", () => {
  // Every category offered as a filter should have at least one feed behind it,
  // otherwise the reader picks it and gets a page that looks broken. Cultura is
  // the known exception: it is currently populated only by items that
  // inferCategory reassigns from other feeds.
  const KNOWN_UNSOURCED = new Set(["Cultura"])

  it("has a feed behind every category except the documented exception", () => {
    const sourced = new Set(FEED_SOURCES.map((source) => source.category))
    const unsourced = news.NEWS_CATEGORIES.filter(
      (category) => category !== "Todas" && !sourced.has(category),
    )
    expect(new Set(unsourced)).toEqual(KNOWN_UNSOURCED)
  })

  it("names every source uniquely, so the source filter cannot be ambiguous", () => {
    const names = FEED_SOURCES.map((source) => source.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
