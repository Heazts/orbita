import type { NextRequest } from "next/server"

// Best-effort per-instance rate limiting against casual abuse. Not a hard
// guarantee across instances — use an edge rate limiter (Vercel Firewall,
// Upstash) for that.
export const RATE_LIMIT_WINDOW_MS = 60_000
export const RATE_LIMIT_MAX_REQUESTS = 30

const requestLog = new Map<string, number[]>()

// x-real-ip is set by the edge proxy from the actual TCP connection and can't be
// spoofed by the client. x-forwarded-for can have attacker-supplied entries
// prepended, but the proxy appends the real client IP as the *last* entry — so
// that's the one to trust, never the first.
export function clientIp(request: Pick<NextRequest, "headers">): string {
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const ips = forwarded.split(",").map((ip) => ip.trim()).filter(Boolean)
    if (ips.length) return ips[ips.length - 1]
  }
  return "unknown"
}

export function isRateLimited(clientId: string, now: number = Date.now()): boolean {
  // Occasionally sweep buckets whose timestamps are all stale so the map
  // doesn't grow unbounded across many distinct IPs.
  if (Math.random() < 0.02) {
    for (const [key, timestamps] of requestLog) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key)
    }
  }
  const recent = (requestLog.get(clientId) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  requestLog.set(clientId, recent)
  return recent.length > RATE_LIMIT_MAX_REQUESTS
}

// Exposed for tests so state doesn't leak between cases.
export function resetRateLimit(): void {
  requestLog.clear()
}
