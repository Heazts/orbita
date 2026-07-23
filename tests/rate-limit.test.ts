import { afterEach, describe, expect, it, vi } from "vitest"
import {
  RATE_LIMIT_MAX_REQUESTS,
  checkRateLimit,
  checkRateLimitDistributed,
  clientIp,
  isDistributedRateLimitEnabled,
  isRateLimited,
  resetRateLimit,
} from "@/lib/rate-limit"

function headers(map: Record<string, string>) {
  return { headers: new Headers(map) }
}

afterEach(() => resetRateLimit())

describe("clientIp", () => {
  it("prefers x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9")
  })

  it("takes the last x-forwarded-for entry (the proxy-appended real IP)", () => {
    expect(clientIp(headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.9" }))).toBe("203.0.113.9")
  })

  it("prefers x-real-ip over x-forwarded-for", () => {
    expect(clientIp(headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9")
  })

  it("returns a fresh unique key per call with no headers, instead of a fixed value", () => {
    // A fixed fallback would let unrelated clients share one rate-limit
    // bucket and lock each other out; a unique key per call avoids that.
    const first = clientIp(headers({}))
    const second = clientIp(headers({}))
    expect(first).toMatch(/^unknown-/)
    expect(second).toMatch(/^unknown-/)
    expect(first).not.toBe(second)
  })
})

describe("isRateLimited", () => {
  it("allows up to the limit, then blocks", () => {
    const now = 1_000_000
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) {
      expect(isRateLimited("a", now)).toBe(false)
    }
    // The request past the limit is blocked.
    expect(isRateLimited("a", now)).toBe(true)
  })

  it("tracks clients independently", () => {
    const now = 2_000_000
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) isRateLimited("a", now)
    // A different client still has a fresh budget.
    expect(isRateLimited("b", now)).toBe(false)
  })

  it("forgets requests older than the window", () => {
    const start = 3_000_000
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) isRateLimited("a", start)
    expect(isRateLimited("a", start)).toBe(true)
    // Well past the 60s window: the old timestamps are dropped.
    expect(isRateLimited("a", start + 61_000)).toBe(false)
  })
})

describe("checkRateLimit", () => {
  it("reports remaining budget and no retry delay while under the limit", () => {
    const now = 4_000_000
    const first = checkRateLimit("a", now)
    expect(first.limited).toBe(false)
    expect(first.remaining).toBe(RATE_LIMIT_MAX_REQUESTS - 1)
    expect(first.retryAfterSeconds).toBe(0)
  })

  it("reports zero remaining and a positive retry delay once limited", () => {
    const now = 5_000_000
    // Exhaust the budget — each call counts as one request.
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) checkRateLimit("a", now)
    // The request past the limit is blocked.
    const result = checkRateLimit("a", now)
    expect(result.limited).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60)
  })
})

describe("checkRateLimitDistributed", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("is disabled without Upstash env vars", () => {
    expect(isDistributedRateLimitEnabled()).toBe(false)
  })

  it("falls back to the in-memory limiter when Upstash is not configured", async () => {
    const now = 6_000_000
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) await checkRateLimitDistributed("mem", now)
    const result = await checkRateLimitDistributed("mem", now)
    expect(result.limited).toBe(true)
  })

  it("counts in Redis and derives limited/remaining from the returned count", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    expect(isDistributedRateLimitEnabled()).toBe(true)

    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([{ result: RATE_LIMIT_MAX_REQUESTS + 1 }, { result: 1 }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await checkRateLimitDistributed("1.2.3.4", 7_000_000)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.limited).toBe(true)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("fails open to the in-memory limiter when the Redis call errors", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })))

    // A single request must not be reported as limited just because Redis is down.
    const result = await checkRateLimitDistributed("5.6.7.8", 8_000_000)
    expect(result.limited).toBe(false)
  })

  it("skips Redis for clients with no identifying IP", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
    const fetchMock = vi.fn(async () => new Response("[]", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await checkRateLimitDistributed("unknown-abc", 9_000_000)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.limited).toBe(false)
  })
})
