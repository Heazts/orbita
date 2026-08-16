import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { NextRequest } from "next/server"
import { POST, GET } from "@/app/api/csp-report/route"
import { resetRateLimit } from "@/lib/rate-limit"

function report(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("https://orbita.news/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/csp-report", "x-real-ip": "203.0.113.50", ...headers },
    body,
  })
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  resetRateLimit()
  warn = vi.spyOn(console, "warn").mockImplementation(() => {})
})

afterEach(() => {
  resetRateLimit()
  warn.mockRestore()
})

describe("POST /api/csp-report", () => {
  it("accepts a legacy csp-report payload and logs the sanitized fields", async () => {
    const response = await POST(
      report(
        JSON.stringify({
          "csp-report": {
            "violated-directive": "script-src",
            "blocked-uri": "https://evil.example/x.js",
            "document-uri": "https://orbita.news/",
          },
        }),
      ),
    )
    expect(response.status).toBe(204)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]).toContain("script-src")
  })

  it("accepts a modern Reporting API batch", async () => {
    const response = await POST(
      report(JSON.stringify([{ body: { effectiveDirective: "img-src", blockedURL: "https://evil.example/x" } }])),
    )
    expect(response.status).toBe(204)
    expect(warn).toHaveBeenCalledOnce()
  })

  // Every one of these used to reach `payload["csp-report"]` on a value that
  // cannot be indexed, throwing a TypeError that surfaced as a 500 from an
  // unauthenticated endpoint. A bare `null` body was enough.
  it.each([
    ["null", "null"],
    ["a bare number", "42"],
    ["a bare string", '"hello"'],
    ["a bare boolean", "true"],
    ["an array of nulls", "[null,null]"],
    ["an array of primitives", '[1,"x",false]'],
    ["an object with a null body", '[{"body":null}]'],
    ["an object with a primitive report", '{"csp-report":7}'],
  ])("returns 204 without throwing for %s", async (_label, body) => {
    const response = await POST(report(body))
    expect(response.status).toBe(204)
    expect(warn).not.toHaveBeenCalled()
  })

  it("returns 204 for a malformed JSON body", async () => {
    expect((await POST(report("{not json"))).status).toBe(204)
  })

  it("returns 413 when the declared length exceeds the cap", async () => {
    const response = await POST(report("{}", { "content-length": "999999" }))
    expect(response.status).toBe(413)
  })

  it("returns 413 when the streamed body exceeds the cap", async () => {
    const response = await POST(report(JSON.stringify({ pad: "a".repeat(20_000) })))
    expect(response.status).toBe(413)
  })

  it("caps how many reports one request can log", async () => {
    const entry = { body: { effectiveDirective: "img-src" } }
    await POST(report(JSON.stringify(Array.from({ length: 50 }, () => entry))))
    expect(warn.mock.calls.length).toBe(20)
  })

  it("caps amplified log lines across request batches", async () => {
    const entry = { body: { effectiveDirective: "img-src" } }
    const batch = JSON.stringify(Array.from({ length: 20 }, () => entry))

    await POST(report(batch))
    await POST(report(batch))
    await POST(report(batch))
    await POST(report(batch))

    expect(warn.mock.calls.length).toBe(60)
  })

  it("strips newlines from report fields so logs cannot be forged", async () => {
    await POST(
      report(JSON.stringify({ "csp-report": { "violated-directive": "script-src\n[csp-violation] fake=1" } })),
    )
    expect(warn.mock.calls[0].join(" ")).not.toContain("\n")
  })
})

describe("GET /api/csp-report", () => {
  it("rejects GET with 405 and an Allow header", () => {
    const response = GET()
    expect(response.status).toBe(405)
    expect(response.headers.get("Allow")).toBe("POST")
  })
})
