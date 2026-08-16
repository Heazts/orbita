import { afterEach, describe, expect, it, vi } from "vitest"
import { createImageProxyUrl, verifyImageProxySignature } from "@/lib/image-proxy-signature"

afterEach(() => vi.unstubAllEnvs())

describe("image proxy signatures", () => {
  it("signs an exact feed image URL and verifies it", () => {
    vi.stubEnv("IMAGE_PROXY_SECRET", "test-image-secret")
    const source = "https://cdn.example.com/photo.jpg?size=large"
    const proxy = createImageProxyUrl(source)
    expect(proxy).toBeTruthy()

    const params = new URL(proxy!, "https://orbita.news").searchParams
    expect(params.get("url")).toBe(source)
    expect(verifyImageProxySignature(source, params.get("sig"))).toBe(true)
  })

  it("rejects URL or signature tampering", () => {
    vi.stubEnv("IMAGE_PROXY_SECRET", "test-image-secret")
    const source = "https://cdn.example.com/photo.jpg"
    const proxy = createImageProxyUrl(source)!
    const signature = new URL(proxy, "https://orbita.news").searchParams.get("sig")

    expect(verifyImageProxySignature(`${source}?bypass=1`, signature)).toBe(false)
    expect(verifyImageProxySignature(source, `${signature}x`)).toBe(false)
  })

  it("fails closed when no signing secret is configured", () => {
    vi.stubEnv("IMAGE_PROXY_SECRET", "")
    vi.stubEnv("CRON_SECRET", "")
    expect(createImageProxyUrl("https://cdn.example.com/photo.jpg")).toBeNull()
    expect(verifyImageProxySignature("https://cdn.example.com/photo.jpg", "anything")).toBe(false)
  })

  it("uses the required production cron secret as a domain-separated fallback", () => {
    vi.stubEnv("IMAGE_PROXY_SECRET", "")
    vi.stubEnv("CRON_SECRET", "cron-secret")
    expect(createImageProxyUrl("https://cdn.example.com/photo.jpg")).toContain("sig=")
  })
})
