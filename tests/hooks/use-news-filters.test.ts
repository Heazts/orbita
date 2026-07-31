import { describe, expect, it } from "vitest"
import { buildApiUrl } from "@/hooks/use-news-filters"

// buildApiUrl is the contract between the dashboard's filter state and
// /api/news. Both sides validate independently, so a mismatch here does not
// crash — it silently returns the wrong news, which is worse.
describe("buildApiUrl", () => {
  it("omits every parameter on the default view", () => {
    expect(buildApiUrl("", "Todas", "all", "latest", "Todas")).toBe("/api/news")
  })

  it("includes the search term", () => {
    expect(buildApiUrl("eleições", "Todas", "all", "latest", "Todas")).toBe(
      "/api/news?q=elei%C3%A7%C3%B5es",
    )
  })

  it("includes a category only when it is not Todas", () => {
    expect(buildApiUrl("", "Economia", "all", "latest", "Todas")).toBe("/api/news?category=Economia")
    expect(buildApiUrl("", "Todas", "all", "latest", "Todas")).not.toContain("category")
  })

  it("includes a source only when it is not Todas", () => {
    expect(buildApiUrl("", "Todas", "all", "latest", "InfoMoney")).toBe("/api/news?source=InfoMoney")
  })

  it("includes sort only when it is not the default", () => {
    expect(buildApiUrl("x", "Todas", "all", "relevance", "Todas")).toContain("sort=relevance")
    expect(buildApiUrl("x", "Todas", "all", "latest", "Todas")).not.toContain("sort")
  })

  // "live" is a UI-only period. The API has no such value — it takes a 1-day
  // window plus a flag — and mapping it wrongly would silently widen the window.
  it("maps the live period to a one-day window plus the live flag", () => {
    const url = buildApiUrl("", "Todas", "live", "latest", "Todas")
    expect(url).toContain("period=1")
    expect(url).toContain("live=true")
    expect(url).not.toContain("period=live")
  })

  it("passes numeric periods through", () => {
    expect(buildApiUrl("", "Todas", "7", "latest", "Todas")).toBe("/api/news?period=7")
  })

  it("omits the period on 'all'", () => {
    expect(buildApiUrl("", "Todas", "all", "latest", "Todas")).not.toContain("period")
  })

  it("combines every filter at once", () => {
    const url = new URL(
      buildApiUrl("clima", "Ciência", "30", "relevance", "NASA"),
      "https://orbita.test",
    )
    expect(url.searchParams.get("q")).toBe("clima")
    expect(url.searchParams.get("category")).toBe("Ciência")
    expect(url.searchParams.get("period")).toBe("30")
    expect(url.searchParams.get("sort")).toBe("relevance")
    expect(url.searchParams.get("source")).toBe("NASA")
  })

  it("escapes values rather than interpolating them raw", () => {
    const url = buildApiUrl("a&b=c", "Todas", "all", "latest", "Todas")
    expect(url).not.toContain("a&b=c")
    expect(new URL(url, "https://orbita.test").searchParams.get("q")).toBe("a&b=c")
  })
})
