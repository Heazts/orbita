"use client"

import { useEffect, useState } from "react"
import type { NewsItem } from "@/lib/news"

/** How long the "novas matérias" badge stays up before clearing itself. */
const CLEAR_AFTER_MS = 10_000

/**
 * Counts headlines that appeared since the reader last saw the list.
 *
 * The comparison runs *during render*, not in an effect. That is React's
 * documented shape for state derived from new props or data: an effect would
 * render once with a stale count, commit, and render again, so the badge would
 * be briefly wrong on every refresh. It also satisfies
 * react-hooks/set-state-in-effect honestly rather than by suppression.
 *
 * Membership is a Set. This runs on every SWR refresh — every 30 to 45 seconds
 * — over up to 100 items, and the nested `Array.includes` scan it replaces cost
 * 100x100 comparisons to produce a result that is almost always zero.
 */
export function useNewItemsCount(items: NewsItem[] | undefined): {
  newCount: number
  resetCount: () => void
} {
  const [newCount, setNewCount] = useState(0)
  // The array the count was last reconciled against. Held in state rather than
  // a ref precisely so the comparison can happen during render.
  const [trackedItems, setTrackedItems] = useState<NewsItem[] | undefined>(undefined)

  if (items !== trackedItems) {
    const previousIds = new Set((trackedItems ?? []).map((item) => item.id))
    let added = 0
    // Skipped on the very first data arrival: everything is new then, and
    // announcing "100 novas matérias" to someone who just opened the page is
    // noise, not news.
    if (previousIds.size > 0) {
      for (const item of items ?? []) {
        if (!previousIds.has(item.id)) added += 1
      }
    }
    setTrackedItems(items)
    if (added > 0) setNewCount((count) => count + added)
  }

  useEffect(() => {
    if (newCount === 0) return undefined
    const timeout = window.setTimeout(() => setNewCount(0), CLEAR_AFTER_MS)
    return () => window.clearTimeout(timeout)
  }, [newCount])

  return { newCount, resetCount: () => setNewCount(0) }
}
