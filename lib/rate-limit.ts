import type { NextRequest } from "next/server"
import { isIP } from "node:net"

// Best-effort per-instance rate limiting against casual abuse. Not a hard
// guarantee across instances on its own — configure the Upstash Redis env vars
// (see checkRateLimitDistributed below) for a cross-instance limit.
export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX_REQUESTS = 30

/**
 * A named counter with its own budget.
 *
 * Routes must not share one bucket. A page can legitimately request a hundred
 * thumbnails while making a single call to /api/news; counting both against the
 * same 30/minute allowance would break the page for an ordinary reader long
 * before it inconvenienced anyone abusing it. The name is part of the key, so
 * each route's traffic is counted separately in memory and in Redis.
 */
export type RateLimitBucket = {
  name: string
  max: number
}

/** Search and feed reads: one call per view, so the budget can stay tight. */
export const NEWS_BUCKET: RateLimitBucket = { name: "news", max: RATE_LIMIT_MAX_REQUESTS }

/**
 * Image proxy. Sized for the page, not the endpoint: a full scroll through the
 * 100-item list requests up to 100 thumbnails, so the budget has to clear that
 * with room for a reload before it starts blanking images for real readers.
 */
export const IMAGE_BUCKET: RateLimitBucket = { name: "img", max: 240 }

/**
 * CSP violation reports. Genuine reports arrive in bursts (one page can breach
 * several directives at once) but a browser has no reason to exceed this.
 */
export const CSP_REPORT_BUCKET: RateLimitBucket = { name: "csp", max: 60 }

const requestLog = new Map<string, number[]>()
const MAX_TRACKED_CLIENTS = 10_000
let lastCleanupAt = 0

function normalizedIp(value: string | null): string | null {
  const candidate = value?.trim()
  // IPv6 textual representations fit within 45 characters. Rejecting anything
  // else also keeps attacker-controlled forwarding headers out of Redis keys.
  return candidate && candidate.length <= 45 && isIP(candidate) ? candidate : null
}

// TRUST BOUNDARY. Both headers read here are attacker-controlled on the wire;
// what makes them usable is the hosting platform overwriting them at the edge
// from the real TCP peer. Vercel — this app's deployment target — does exactly
// that, which is why x-real-ip is taken at face value and why the *last*
// x-forwarded-for entry (the one a forwarding proxy appends, as opposed to the
// leading entries a client can forge) is the one trusted.
//
// This is an assumption about the deployment, not a property of this code. Host
// the app anywhere that passes these headers through untouched and the rate
// limiter becomes decorative: a caller that varies x-real-ip per request gets a
// fresh budget every time. Verify after any hosting change by sending two
// requests with different forged x-real-ip values and confirming
// X-RateLimit-Remaining does *not* reset between them.
export function clientIp(request: Pick<NextRequest, "headers">): string {
  const realIp = normalizedIp(request.headers.get("x-real-ip"))
  if (realIp) return realIp
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean)
    const proxyAppendedIp = normalizedIp(ips.at(-1) ?? null)
    if (proxyAppendedIp) return proxyAppendedIp
  }
  // No IP-identifying header at all — shouldn't happen behind Vercel's proxy,
  // which always sets x-forwarded-for, but could on another host without one.
  // A fresh key per call (not a fixed "unknown" string) keeps unrelated
  // clients from sharing a bucket and locking each other out; it also means
  // such requests aren't rate-limited, same as if this feature didn't exist.
  return `unknown-${crypto.randomUUID()}`
}

export type RateLimitResult = {
  limited: boolean
  // Requests still allowed in the current window (0 when limited).
  remaining: number
  // Seconds until the oldest counted request leaves the window — what to put in
  // a Retry-After header when limited.
  retryAfterSeconds: number
}

export function checkRateLimit(
  clientId: string,
  now: number = Date.now(),
  bucket: RateLimitBucket = NEWS_BUCKET,
): RateLimitResult {
  // clientIp() returns a fresh unknown-<uuid> per call when no IP header is
  // present. Storing those keys would leak memory (each entry lives for the
  // whole window but can never be revisited), so short-circuit here — the
  // effective outcome is identical to a first-and-only hit.
  //
  // Tested against the raw clientId, before the bucket prefix is applied: a
  // prefixed key would no longer start with "unknown-" and the guard would
  // silently stop working.
  if (clientId.startsWith("unknown-")) {
    return { limited: false, remaining: bucket.max - 1, retryAfterSeconds: 0 }
  }

  const bucketKey = `${bucket.name}:${clientId}`

  // Remove expired buckets periodically and cap the map even within a single
  // window. Without both guards, a stream of unique client addresses could
  // make a long-lived Node instance retain entries indefinitely.
  if (now - lastCleanupAt >= RATE_LIMIT_WINDOW_MS) {
    for (const [key, timestamps] of requestLog) {
      if (!timestamps.length || now - timestamps[timestamps.length - 1] >= RATE_LIMIT_WINDOW_MS) {
        requestLog.delete(key)
      }
    }
    lastCleanupAt = now
  }

  const knownClient = requestLog.has(bucketKey)
  if (!knownClient && requestLog.size >= MAX_TRACKED_CLIENTS) {
    const oldestClient = requestLog.keys().next().value
    if (oldestClient !== undefined) requestLog.delete(oldestClient)
  }

  const recent = (requestLog.get(bucketKey) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  // Refresh insertion order so the bounded map evicts the least recently seen
  // client when it reaches capacity.
  if (knownClient) requestLog.delete(bucketKey)
  requestLog.set(bucketKey, recent)
  const limited = recent.length > bucket.max
  const remaining = Math.max(0, bucket.max - recent.length)
  const retryAfterSeconds = limited ? Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000)) : 0
  return { limited, remaining, retryAfterSeconds }
}

export function isRateLimited(
  clientId: string,
  now: number = Date.now(),
  bucket: RateLimitBucket = NEWS_BUCKET,
): boolean {
  return checkRateLimit(clientId, now, bucket).limited
}

// Exposed for tests so state doesn't leak between cases.
export function resetRateLimit(): void {
  requestLog.clear()
  lastCleanupAt = 0
}

// --- Distributed rate limiting (optional) --------------------------------
//
// The in-memory limiter above is per-instance: on a serverless platform each
// concurrent instance keeps its own counter, so the effective global limit is
// higher than RATE_LIMIT_MAX_REQUESTS. When an Upstash Redis REST endpoint is
// configured, we count in Redis instead so the limit holds across every
// instance. It's a fixed-window counter — one Redis key per (client, minute) —
// which is simple, atomic (INCR), and self-expiring.
//
// Configure with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// (created in the Upstash console / Vercel Upstash integration). With neither
// set, everything transparently falls back to the in-memory limiter.

// Bound the Redis round-trip so a slow/unreachable store never stalls the API.
const UPSTASH_TIMEOUT_MS = 1_000

// Read lazily (not captured at import) so tests can toggle the env and so a
// runtime-provisioned secret is picked up without a rebuild.
function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

export function isDistributedRateLimitEnabled(): boolean {
  return upstashConfig() !== null
}

// Runs an Upstash REST pipeline and returns each command's `result`, or null on
// any transport/shape error so the caller can fall back.
async function upstashPipeline(commands: (string | number)[][]): Promise<unknown[] | null> {
  const config = upstashConfig()
  if (!config) return null
  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return null
    const data = (await response.json()) as ({ result?: unknown; error?: string } | unknown)[]
    if (!Array.isArray(data)) return null
    return data.map((entry) =>
      entry && typeof entry === "object" && "result" in entry ? (entry as { result: unknown }).result : entry,
    )
  } catch {
    // Timeout, network error, bad JSON — treat as "store unavailable".
    return null
  }
}

// Distributed counterpart to checkRateLimit. Falls back to the per-instance
// limiter when Upstash isn't configured or is unreachable (fail-open: this is
// abuse mitigation, not authentication, so availability wins over strictness).
export async function checkRateLimitDistributed(
  clientId: string,
  now: number = Date.now(),
  bucket: RateLimitBucket = NEWS_BUCKET,
): Promise<RateLimitResult> {
  // Clients with no identifying IP get a unique key per request (see clientIp),
  // so a shared counter is meaningless — skip Redis and use the local path.
  if (!isDistributedRateLimitEnabled() || clientId.startsWith("unknown-")) {
    return checkRateLimit(clientId, now, bucket)
  }

  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS)
  const key = `orbita:rl:${bucket.name}:${clientId}:${windowStart}`
  // INCR creates the key at 1 on the first hit; PEXPIRE bounds its lifetime to
  // the window so stale keys clean themselves up.
  const results = await upstashPipeline([
    ["INCR", key],
    ["PEXPIRE", key, RATE_LIMIT_WINDOW_MS],
  ])

  const count = results && typeof results[0] === "number" ? results[0] : null
  if (count === null) return checkRateLimit(clientId, now, bucket)

  const limited = count > bucket.max
  const remaining = Math.max(0, bucket.max - count)
  const windowEnd = (windowStart + 1) * RATE_LIMIT_WINDOW_MS
  const retryAfterSeconds = limited ? Math.max(1, Math.ceil((windowEnd - now) / 1000)) : 0
  return { limited, remaining, retryAfterSeconds }
}
