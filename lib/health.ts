/**
 * Per-source health for the aggregator.
 *
 * A feed that starts refusing requests does not break the site — it quietly
 * removes a category from it. Readers see a banner naming the failed sources,
 * but nothing told whoever runs the site, so a dead feed could sit dead
 * indefinitely. This turns that into something checkable.
 *
 * It reads through the same cache the pages use (loadFeedCached), so asking for
 * the status costs no extra requests to the outlets and reports what readers
 * are actually being served rather than a separate probe that might disagree.
 */

import { FEED_SOURCES, type FeedSource } from "@/lib/news"
import { loadFeedCached } from "@/lib/aggregate"

// A feed that still answers but stopped publishing is its own kind of broken,
// and the only way to see it is the age of the newest item. Two days is long
// enough that a quiet weekend at a small outlet does not raise it.
export const STALE_AFTER_HOURS = 48

export type SourceHealth = {
  name: string
  category: string
  status: "ok" | "stale" | "down"
  itemCount: number
  // Hours since the most recent dated item; null when the feed dates nothing.
  newestAgeHours: number | null
  // Present only when status is "down". Carries the failure's shape (a status
  // code, a timeout) and never the response body.
  error?: string
}

export type HealthReport = {
  checkedAt: string
  status: "ok" | "degraded" | "down"
  total: number
  ok: number
  stale: number
  down: number
  // Categories left with no working source at all — the reader-visible
  // consequence, and the reason this is worth alerting on.
  emptyCategories: string[]
  sources: SourceHealth[]
}

function ageInHours(items: { publishedAt: string }[]): number | null {
  const times = items
    .map((item) => Date.parse(item.publishedAt))
    .filter((time) => !Number.isNaN(time))
  if (times.length === 0) return null
  return (Date.now() - Math.max(...times)) / 3_600_000
}

function describe(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason)
  // fetchFeed throws "Feed <name>: <status>"; keep the part after the colon so
  // the source name is not repeated, and cap it so nothing large leaks out.
  return message.split(": ").slice(1).join(": ").slice(0, 120) || message.slice(0, 120)
}

function healthOf(source: FeedSource, result: PromiseSettledResult<{ publishedAt: string }[]>): SourceHealth {
  const base = { name: source.name, category: source.category }
  if (result.status === "rejected") {
    return { ...base, status: "down", itemCount: 0, newestAgeHours: null, error: describe(result.reason) }
  }
  const items = result.value
  const newestAgeHours = ageInHours(items)
  // No items at all is a failure even with a 200 response: the feed parsed to
  // nothing, so the reader gets nothing.
  if (items.length === 0) {
    return { ...base, status: "down", itemCount: 0, newestAgeHours, error: "feed sem itens" }
  }
  const stale = newestAgeHours !== null && newestAgeHours > STALE_AFTER_HOURS
  return { ...base, status: stale ? "stale" : "ok", itemCount: items.length, newestAgeHours }
}

export async function checkSourcesHealth(sources: FeedSource[] = FEED_SOURCES): Promise<HealthReport> {
  const results = await Promise.allSettled(sources.map(loadFeedCached))
  const health = sources.map((source, index) => healthOf(source, results[index]))

  const counts = { ok: 0, stale: 0, down: 0 }
  for (const source of health) counts[source.status] += 1

  // A category is empty when every source feeding it is down. Stale still
  // counts as working — old news is news; no news is a hole in the site.
  const categories = new Set(sources.map((source) => source.category))
  const emptyCategories = [...categories]
    .filter((category) =>
      health.every((source) => source.category !== category || source.status === "down"),
    )
    .sort()

  return {
    checkedAt: new Date().toISOString(),
    status: counts.down === sources.length && sources.length > 0 ? "down" : counts.down > 0 ? "degraded" : "ok",
    total: sources.length,
    ...counts,
    emptyCategories,
    sources: health,
  }
}
