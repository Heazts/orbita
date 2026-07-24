"use client"

import { useNow } from "@/hooks/use-now"
import type { NewsItem } from "@/lib/news"

type TickerProps = {
  items: NewsItem[]
  isLive: boolean
}

function relativeTime(publishedAt: string, now: number | null): string {
  if (now === null) return ""
  const parsed = Date.parse(publishedAt)
  if (Number.isNaN(parsed)) return ""
  const diff = now - parsed
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function Ticker({ items, isLive }: TickerProps) {
  // Reading Date.now() during render is impure; useNow returns null pre-hydration
  // and then a value that ticks on an interval — the relative timestamps stay fresh
  // without producing SSR/CSR text mismatches.
  const now = useNow()
  const recentItems =
    isLive && now !== null
      ? items.filter((item) => now - Date.parse(item.publishedAt) < 2 * 60 * 60_000)
      : items

  const displayItems = recentItems.length > 0 ? recentItems : items

  return (
    <div
      className="ticker border-b border-destructive/20 bg-destructive/5"
      aria-label="Últimas manchetes"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-7xl items-center">
        {isLive && (
          <div className="z-10 flex shrink-0 items-center gap-2 border-r border-destructive/20 bg-destructive px-3 py-2 text-xs font-bold uppercase text-white md:px-4">
            <span className="live-dot size-1.5 rounded-full bg-white" />
            <span className="hidden sm:inline">Ao vivo</span>
          </div>
        )}
        <div className="ticker-track flex w-max items-center gap-8 py-2 pl-4 text-xs font-bold uppercase tracking-wider md:gap-10 md:pl-6">
          {[...displayItems, ...displayItems].map((item, index) => {
            const isDuplicate = index >= displayItems.length
            return (
              <a
                key={`${item.id}-${index}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-hidden={isDuplicate || undefined}
                tabIndex={isDuplicate ? -1 : undefined}
                className="flex items-center gap-2 whitespace-nowrap text-foreground/80 transition-colors hover:text-foreground hover:underline"
              >
                {isLive && (
                  <span className="live-dot size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden="true" />
                )}
                <span className="text-foreground/40" aria-hidden="true">
                  {relativeTime(item.publishedAt, now)}
                </span>
                <span>{item.title}</span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}