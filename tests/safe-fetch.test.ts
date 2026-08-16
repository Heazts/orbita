import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchSameOrigin } from "@/lib/safe-fetch"

afterEach(() => vi.unstubAllGlobals())

describe("fetchSameOrigin", () => {
  it("preserves a legitimate same-origin HTTPS redirect", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { Location: "/canonical-feed" } }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const response = await fetchSameOrigin("https://feeds.example.com/old")
    expect(await response.text()).toBe("ok")
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://feeds.example.com/canonical-feed")
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: "manual" })
  })

  it.each([
    "http://feeds.example.com/internal",
    "https://127.0.0.1/internal",
    "https://metadata.google.internal/latest",
    "https://other.example.com/feed",
  ])("rejects an unsafe or cross-origin redirect to %s", async (location) => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { Location: location } }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchSameOrigin("https://feeds.example.com/feed")).rejects.toThrow("não permitido")
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it("stops redirect loops at the configured bound", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 302, headers: { Location: "/again" } }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchSameOrigin("https://feeds.example.com/feed", {}, 2)).rejects.toThrow("não permitido")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
