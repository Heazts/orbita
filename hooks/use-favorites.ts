"use client"

import { useCallback, useEffect, useState } from "react"
import type { NewsItem } from "@/lib/news"
import { readStore, writeStore } from "@/lib/storage"

export function useFavorites(): {
  favorites: Record<string, NewsItem>
  favoritesCount: number
  toggleFavorite: (item: NewsItem) => void
} {
  const [favorites, setFavorites] = useState<Record<string, NewsItem>>({})
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavorites(readStore<Record<string, NewsItem>>("orbita-favorites", {}))
  }, [])
  const toggleFavorite = useCallback((item: NewsItem) => {
    setFavorites((current) => {
      const next = { ...current }
      if (next[item.id]) delete next[item.id]
      else next[item.id] = item
      writeStore("orbita-favorites", next)
      return next
    })
  }, [])
  return { favorites, toggleFavorite, favoritesCount: Object.keys(favorites).length }
}
