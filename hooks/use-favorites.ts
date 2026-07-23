"use client"

import { useEffect, useCallback } from "react"
import type { NewsItem } from "@/lib/news"
import { writeStore } from "@/lib/storage"
import { useHydratedState } from "@/hooks/use-hydrated-state"

export function useFavorites(): {
  favorites: Record<string, NewsItem>
  favoritesCount: number
  toggleFavorite: (item: NewsItem) => void
} {
  const [favorites, setFavorites] = useHydratedState<Record<string, NewsItem>>("orbita-favorites", {})
  const toggleFavorite = useCallback((item: NewsItem) => {
    setFavorites((current) => {
      const next = { ...current }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      return next
    })
  }, [setFavorites])

  useEffect(() => {
    writeStore("orbita-favorites", favorites)
  }, [favorites])

  return { favorites, toggleFavorite, favoritesCount: Object.keys(favorites).length }
}
