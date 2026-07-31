// localStorage is unavailable during SSR and can throw in private browsing
// or when the quota is exceeded — every call here is best-effort.

import type { Guard } from "@/lib/guards"

// Whatever sits under our keys is untrusted input: it can be a stale schema
// from an older release, a value written by a browser extension or another app
// on the same origin, or a write that was truncated when the quota ran out.
export type StoredValueGuard<T> = Guard<T>

// Coarse shape check used when the caller passes no guard. The previous
// `typeof parsed === typeof fallback` test was no guard at all for structured
// values — typeof [] and typeof {} are both "object", so an array passed as a
// Record (and vice versa) and the malformed value reached components that then
// crashed on it. Callers holding anything with internal structure should pass a
// real guard; this only rules out the coarse mismatches.
function matchesFallbackShape(parsed: unknown, fallback: unknown): boolean {
  if (Array.isArray(fallback)) return Array.isArray(parsed)
  if (fallback !== null && typeof fallback === "object") {
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
  }
  return typeof parsed === typeof fallback && parsed !== null
}

export function readStore<T>(key: string, fallback: T, isValid?: StoredValueGuard<T>): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (isValid) return isValid(parsed) ? parsed : fallback
    return matchesFallbackShape(parsed, fallback) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value))
  } catch {
    // Private mode or quota exceeded — persistence is best-effort.
  }
}
