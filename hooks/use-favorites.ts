"use client"

import { useCallback } from "react"
import type { NewsItem } from "@/lib/news"
import { useHydratedState } from "@/hooks/use-hydrated-state"

export function useFavorites(): {
  favorites: Record<string, NewsItem>
  favoritesCount: number
  toggleFavorite: (item: NewsItem) => void
} {
  const [favorites, setFavorites] = useHydratedState<Record<string, NewsItem>>(
    "orbita-favorites",
    {},
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
