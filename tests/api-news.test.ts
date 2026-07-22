import { describe, expect, it } from "vitest"
import { FEED_SOURCES, NEWS_CATEGORIES } from "@/lib/news"

describe("News API route configuration", () => {
  it("has valid NEWS_CATEGORIES", () => {
    expect(NEWS_CATEGORIES).toContain("Todas")
    expect(NEWS_CATEGORIES).toContain("Mundo")
    expect(NEWS_CATEGORIES).toContain("Política")
  })

  it("all feed sources have HTTPS URLs", () => {
    for (const source of FEED_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
    }
  })

  it("all feed sources have a valid category", () => {
    for (const source of FEED_SOURCES) {
      expect(NEWS_CATEGORIES).toContain(source.category)
    }
  })
})
