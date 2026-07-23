"use client"

import type { NewsItem } from "@/lib/news"
import { NewsCard } from "@/components/news-card"

type NewsListProps = {
  items: NewsItem[]
  now: number | null
  query: string
  favorites: Record<string, NewsItem>
  onToggleFavorite: (item: NewsItem) => void
  onShare: (item: NewsItem) => void
}

export function NewsList({
  items,
  now,
  query,
  favorites,
  onToggleFavorite,
  onShare,
}: NewsListProps) {
  return (
    <section className="flex flex-col">
      {items.map((item, index) => (
        <NewsCard
          key={item.id}
          item={item}
          now={now}
          query={query}
          lead={index === 0 && !query}
          favorite={Boolean(favorites[item.id])}
          onFavorite={() => onToggleFavorite(item)}
          onShare={() => onShare(item)}
        />
      ))}
    </section>
  )
}