"use client"

import { useState } from "react"
import { useNow } from "@/hooks/use-now"
import { relativeTime } from "@/lib/time"
import type { NewsItem } from "@/lib/news"
import { Pause, Play } from "lucide-react"

type TickerProps = {
  items: NewsItem[]
  isLive: boolean
}

export function Ticker({ items, isLive }: TickerProps) {
  // Reading Date.now() during render is impure; useNow returns null pre-hydration
  // and then a value that ticks on an interval.
  const now = useNow()
  // Accessible pause control: users who need time to read can stop the ticker.
  const [paused, setPaused] = useState(false)

  const recentItems =
    isLive && now !== null
      ? items.filter((item) => now - Date.parse(item.publishedAt) < 2 * 60 * 60_000)
      : items

  const displayItems = recentItems.length > 0 ? recentItems : items

  return (
    <div
      className={`ticker border-b border-destructive/20 bg-destructive/5 py-1 ${paused ? "ticker--paused" : ""}`}
      aria-label="Manchetes ao vivo"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 md:px-8">
        {isLive && (
          <div className="z-10 flex shrink-0 items-center gap-2 rounded-full border border-destructive/30 bg-destructive px-3 py-1 text-xs font-bold uppercase text-white">
            <span className="live-dot size-1.5 rounded-full bg-white" />
            <span>Ao vivo</span>
          </div>
        )}

        {/* Vertical Ticker Container: headlines pass vertically upward */}
        <div className="relative h-7 flex-1 overflow-hidden">
          <div
            className="ticker-track-vertical flex flex-col text-xs font-bold uppercase tracking-wider"
            aria-hidden="true"
          >
            {[...displayItems, ...displayItems].map((item, index) => (
              <a
                key={`${item.id}-${index}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                className="flex h-7 shrink-0 items-center gap-3 whitespace-nowrap text-foreground/90 transition-colors hover:text-foreground hover:underline"
              >
                <span className="shrink-0 text-foreground/40 font-mono">
                  {relativeTime(item.publishedAt, now, true)}
                </span>
                <span className="truncate">{item.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Pause/Play Button */}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Retomar manchetes" : "Pausar manchetes"}
          aria-pressed={paused}
          className="shrink-0 flex size-7 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}