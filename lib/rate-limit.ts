import type { NextRequest } from "next/server"
import { isIP } from "node:net"

// Best-effort per-instance rate limiting against casual abuse. Not a hard
// guarantee across instances on its own — configure the Upstash Redis env vars
// (see checkRateLimitDistributed below) for a cross-instance limit.
export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX_REQUESTS = 30

const requestLog = new Map<string, number[]>()
const MAX_TRACKED_CLIENTS = 10_000
let lastCleanupAt = 0

function normalizedIp(value: string | null): string | null {
  const candidate = value?.trim()
  // IPv6 textual representations fit within 45 characters. Rejecting anything
  // else also keeps attacker-controlled forwarding headers out of Redis keys.
  return candidate && candidate.length <= 45 && isIP(candidate) ? candidate : null
}

// x-real-ip is set by the edge proxy from the actual TCP connection and can't be
// spoofed by the client. x-forwarded-for can have attacker-supplied entries
// prepended, but the proxy appends the real client IP as the *last* entry — so
// that's the one to trust, never the first.
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

export function checkRateLimit(clientId: string, now: number = Date.now()): RateLimitResult {
  // clientIp() returns a fresh unknown-<uuid> per call when no IP header is
  // present. Storing those keys would leak memory (each entry lives for the
  // whole window but can never be revisited), so short-circuit here — the
  // effective outcome is identical to a first-and-only hit.
  if (clientId.startsWith("unknown-")) {
    return { limited: false, remaining: RATE_LIMIT_MAX_REQUESTS - 1, retryAfterSeconds: 0 }
  }

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

  const knownClient = requestLog.has(clientId)
  if (!knownClient && requestLog.size >= MAX_TRACKED_CLIENTS) {
    const oldestClient = requestLog.keys().next().value
    if (oldestClient !== undefined) requestLog.delete(oldestClient)
  }

  const recent = (requestLog.get(clientId) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  // Refresh insertion order so the bounded map evicts the least recently seen
  // client when it reaches capacity.
  if (knownClient) requestLog.delete(clientId)
  requestLog.set(clientId, recent)
  const limited = recent.length > RATE_LIMIT_MAX_REQUESTS
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - recent.length)
  const retryAfterSeconds = limited ? Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000)) : 0
  return { limited, remaining, retryAfterSeconds }
}

export function isRateLimited(clientId: string, now: number = Date.now()): boolean {
  return checkRateLimit(clientId, now).limited
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
): Promise<RateLimitResult> {
  // Clients with no identifying IP get a unique key per request (see clientIp),
  // so a shared counter is meaningless — skip Redis and use the local path.
  if (!isDistributedRateLimitEnabled() || clientId.startsWith("unknown-")) {
    return checkRateLimit(clientId, now)
  }

  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS)
  const key = `orbita:rl:${clientId}:${windowStart}`
  // INCR creates the key at 1 on the first hit; PEXPIRE bounds its lifetime to
  // the window so stale keys clean themselves up.
  const results = await upstashPipeline([
    ["INCR", key],
    ["PEXPIRE", key, RATE_LIMIT_WINDOW_MS],
  ])

  const count = results && typeof results[0] === "number" ? results[0] : null
  if (count === null) return checkRateLimit(clientId, now)

  const limited = count > RATE_LIMIT_MAX_REQUESTS
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count)
  const windowEnd = (windowStart + 1) * RATE_LIMIT_WINDOW_MS
  const retryAfterSeconds = limited ? Math.max(1, Math.ceil((windowEnd - now) / 1000)) : 0
  return { limited, remaining, retryAfterSeconds }
}
