import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET } from "@/app/api/img-proxy/route"
import { IMAGE_BUCKET, NEWS_BUCKET, resetRateLimit } from "@/lib/rate-limit"
import { createImageProxyUrl } from "@/lib/image-proxy-signature"

/**
 * The image proxy had no route-level test at all — only lib/safe-remote-url.ts,
 * which covers where it may connect but not what the handler does with the
 * result. It was also the only reader-facing endpoint with no rate limit, which
 * made it an open relay: any caller could have this server pull an 8 MB image
 * from any public HTTPS host, repeatedly, and have the reply cached at the edge
 * under a URL of their choosing.
 */

function proxyRequest(url: string, ip = "203.0.113.10"): NextRequest {
  const target = url
    ? createImageProxyUrl(url) ?? `/api/img-proxy?url=${encodeURIComponent(url)}&sig=invalid`
    : "/api/img-proxy"
  return new NextRequest(`https://orbita.news${target}`, {
    headers: { "x-real-ip": ip },
  })
}

beforeEach(() => {
  vi.stubEnv("IMAGE_PROXY_SECRET", "test-image-secret")
  resetRateLimit()
})
afterEach(() => {
  vi.unstubAllEnvs()
  resetRateLimit()
})

describe("GET /api/img-proxy rejects unusable targets", () => {
  it("requires the url parameter", async () => {
    const response = await GET(proxyRequest(""))
    expect(response.status).toBe(400)
  })

  it("rejects an unsigned arbitrary public URL before DNS or egress", async () => {
    const request = new NextRequest(
      "https://orbita.news/api/img-proxy?url=https%3A%2F%2Fexample.com%2Fphoto.jpg",
      { headers: { "x-real-ip": "203.0.113.11" } },
    )
    const response = await GET(request)
    expect(response.status).toBe(403)
    expect(response.headers.get("Cache-Control")).toContain("no-store")
  })

  it.each([
    ["loopback by name", "https://localhost/a.png", 400],
    ["loopback by address", "https://127.0.0.1/a.png", 400],
    ["link-local metadata service", "https://169.254.169.254/latest/meta-data/", 400],
    ["private range", "https://10.0.0.1/a.png", 400],
    ["IPv6 loopback", "https://[::1]/a.png", 400],
    ["plain http", "http://example.com/a.png", 403],
    ["non-http scheme", "file:///etc/passwd", 403],
    ["credentials in the url", "https://user:pass@example.com/a.png", 400],
    ["non-443 port", "https://example.com:8080/a.png", 400],
  ])("refuses %s", async (_label, url, expectedStatus) => {
    const response = await GET(proxyRequest(url))
    expect(response.status).toBe(expectedStatus)
  })
})

describe("GET /api/img-proxy is rate limited", () => {
  it("serves up to the image bucket's budget, then answers 429", async () => {
    const ip = "203.0.113.20"
    // Every one of these is refused at validation (400) — the point is that the
    // limiter counts the request regardless, so a caller cannot spend the
    // server's outbound budget just by choosing targets that fail late.
    for (let i = 0; i < IMAGE_BUCKET.max; i += 1) {
      const response = await GET(proxyRequest(`https://localhost/${i}.png`, ip))
      expect(response.status).not.toBe(429)
    }

    const limited = await GET(proxyRequest("https://localhost/over.png", ip))
    expect(limited.status).toBe(429)
    expect(limited.headers.get("Retry-After")).toBeTruthy()
  })

  it("does not cache the 429 at the edge", async () => {
    const ip = "203.0.113.21"
    for (let i = 0; i <= IMAGE_BUCKET.max; i += 1) await GET(proxyRequest(`https://localhost/${i}.png`, ip))

    const limited = await GET(proxyRequest("https://localhost/x.png", ip))
    expect(limited.status).toBe(429)
    // vercel.json puts a week-long s-maxage on this path. Letting a rejection
    // inherit it would hand one caller's 429 to everyone behind the same edge.
    expect(limited.headers.get("Cache-Control")).toContain("no-store")
  })

  it("counts each client separately", async () => {
    for (let i = 0; i <= IMAGE_BUCKET.max; i += 1) {
      await GET(proxyRequest(`https://localhost/${i}.png`, "203.0.113.30"))
    }
    expect((await GET(proxyRequest("https://localhost/a.png", "203.0.113.30"))).status).toBe(429)
    // A different reader still has a full budget.
    expect((await GET(proxyRequest("https://localhost/a.png", "203.0.113.31"))).status).toBe(400)
  })

  it("has a budget of its own, wide enough for a full page of thumbnails", () => {
    // The list renders up to 100 items, each of which may carry an image, so a
    // single scroll must not exhaust it — and it must not share the news
    // allowance, or loading thumbnails would lock the reader out of searching.
    expect(IMAGE_BUCKET.name).not.toBe(NEWS_BUCKET.name)
    expect(IMAGE_BUCKET.max).toBeGreaterThan(100)
  })
})
