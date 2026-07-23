import { describe, expect, it } from "vitest"
import { buildApiUrl } from "@/lib/api-url"

describe("buildApiUrl", () => {
  it("returns the bare endpoint when every filter is at its default", () => {
    expect(buildApiUrl("", "Todas", "all", "latest", "Todas")).toBe("/api/news")
  })

  it("adds q for a non-empty query", () => {
    expect(buildApiUrl("eleição", "Todas", "all", "latest", "Todas")).toBe(
      "/api/news?q=elei%C3%A7%C3%A3o",
    )
  })

  it("adds category only when it isn't Todas", () => {
    expect(buildApiUrl("", "Tecnologia", "all", "latest", "Todas")).toBe(
      "/api/news?category=Tecnologia",
    )
  })

  it("maps the live period to period=1&live=true", () => {
    const url = buildApiUrl("", "Todas", "live", "latest", "Todas")
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("period")).toBe("1")
    expect(params.get("live")).toBe("true")
  })

  it("passes numeric periods straight through", () => {
    expect(buildApiUrl("", "Todas", "7", "latest", "Todas")).toBe("/api/news?period=7")
  })

  it("adds sort only when it isn't latest", () => {
    expect(buildApiUrl("", "Todas", "all", "relevance", "Todas")).toBe(
      "/api/news?sort=relevance",
    )
  })

  it("adds source only when it isn't Todas", () => {
    expect(buildApiUrl("", "Todas", "all", "latest", "BBC Brasil")).toBe(
      "/api/news?source=BBC+Brasil",
    )
  })

  it("combines every filter at once", () => {
    const url = buildApiUrl("clima", "Ciência", "7", "relevance", "NASA")
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("q")).toBe("clima")
    expect(params.get("category")).toBe("Ciência")
    expect(params.get("period")).toBe("7")
    expect(params.get("sort")).toBe("relevance")
    expect(params.get("source")).toBe("NASA")
  })
})
