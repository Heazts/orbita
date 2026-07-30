/**
 * Shared time utility for relative timestamps.
 * Previously duplicated (with inconsistent implementations) in
 * news-card.tsx (Math.round, "há X") and ticker.tsx (Math.floor, no prefix).
 *
 * This is the single source of truth for both.
 */

/**
 * Returns a human-readable relative time string for a given ISO date.
 * Returns "" if `now` is null (pre-hydration) or the date is invalid.
 *
 * @param value     - ISO 8601 date string (item.publishedAt)
 * @param now       - current timestamp from useNow() — null before hydration
 * @param compact   - when true, uses short format ("5min", "3h", "2d")
 *                    when false (default), uses long format ("há 5 min", "há 3h", "há 2d")
 */
export function relativeTime(
  value: string,
  now: number | null,
  compact = false,
): string {
  if (now === null) return ""
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return ""
  const diff = now - parsed
  const minutes = Math.max(0, Math.floor(diff / 60_000))
  if (minutes < 1) return "agora"
  if (minutes < 60) return compact ? `${minutes}min` : `há ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return compact ? `${hours}h` : `há ${hours}h`
  const days = Math.floor(hours / 24)
  return compact ? `${days}d` : `há ${days}d`
}

/**
 * Returns true if the item was published within the last 30 minutes.
 */
export function isNew(value: string, now: number | null): boolean {
  if (now === null) return false
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return false
  const diff = now - parsed
  return diff >= 0 && diff < 30 * 60_000
}
