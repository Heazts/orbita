"use client"

import { useCallback } from "react"
import type { NewsItem } from "@/lib/news"
import { useHydratedState } from "@/hooks/use-hydrated-state"
import { isPlainObject } from "@/lib/guards"

// Only the fields the favorites UI actually renders or keys on are required —
// enough that a malformed entry can never reach JSX, where a non-string title
// would throw "Objects are not valid as a React child" and blank the page.
function isFavoritesMap(value: unknown): value is Record<string, NewsItem> {
  return (
    isPlainObject(value) &&
    Object.values(value).every(
      (item) =>
        isPlainObject(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.url === "string" &&
        typeof item.source === "string",
    )
  )
}

export function useFavorites(): {
  favorites: Record<string, NewsItem>
  favoritesCount: number
  toggleFavorite: (item: NewsItem) => void
} {
  const [favorites, setFavorites] = useHydratedState<Record<string, NewsItem>>(
    "orbita-favorites",
    {},
    isFavoritesMap,
  )
  const toggleFavorite = useCallback(
    (item: NewsItem) => {
      setFavorites((current) => {
        const next = { ...current }
        if (next[item.id]) delete next[item.id]
        else next[item.id] = item
        return next
      })
    },
    [setFavorites],
  )

  return {
    favorites,
    toggleFavorite,
    favoritesCount: Object.keys(favorites).length,
  }
}
