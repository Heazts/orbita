"use client"

import { useMemo } from "react"
import type { NewsItem } from "@/lib/news"
import { relativeTime, isNew } from "@/lib/time"
import { NewsCard } from "@/components/news-card"

type NewsListProps = {
  items: NewsItem[]
  /** Ticks every 60s from useNow(); null before hydration. */
  now: number | null
  query: string
  favorites: Record<string, NewsItem>
  /**
   * Passed straight through to every card. These must be referentially stable
   * (useCallback or a setState function) or the cards' memo is defeated.
   */
  onToggleFavorite: (item: NewsItem) => void
  onShare: (item: NewsItem) => void
  onQuickSummary?: (item: NewsItem) => void
  onShowSources?: (item: NewsItem) => void
}

export function NewsList({
  items,
  now,
  query,
  favorites,
  onToggleFavorite,
  onShare,
  onQuickSummary,
  onShowSources,
}: NewsListProps) {
  // Formatting happens here, once per item, rather than inside each card.
  //
  // The point is not the cost of the formatting — it is trivial — but that it
  // absorbs the clock. `now` changes every minute; the string it produces
  // changes far less often ("há 3 horas" holds for an hour). Turning the tick
  // into a string here means a card only re-renders when what it displays
  // actually differs, instead of every card re-rendering every minute.
  const rendered = useMemo(
    () =>
      items.map((item) => ({
        item,
        time: relativeTime(item.publishedAt, now),
        fresh: isNew(item.publishedAt, now),
      })),
    [items, now],
  )

  return (
    <section className="flex flex-col">
      {rendered.map(({ item, time, fresh }, index) => (
        <NewsCard
          key={item.id}
          item={item}
          time={time}
          isNew={fresh}
          query={query}
          lead={index === 0 && !query}
          staggerIndex={index}
          favorite={Boolean(favorites[item.id])}
          onFavorite={onToggleFavorite}
          onShare={onShare}
          onQuickSummary={onQuickSummary}
          onShowSources={onShowSources}
        />
      ))}
    </section>
  )
}
