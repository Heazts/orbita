"use client"

import { useNow } from "@/hooks/use-now"
import { relativeTime } from "@/lib/time"
import type { NewsItem } from "@/lib/news"

// A read-only list: no favourites, share or AI actions. The student page is a
// reading surface, so each row is the whole link target rather than a card
// wrapping several competing controls.
export function StudentNewsList({ items }: { items: NewsItem[] }) {
  const now = useNow()

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Nenhuma matéria de educação disponível no momento. As fontes são recarregadas a cada 5 minutos.
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const time = relativeTime(item.publishedAt, now)
        return (
          <li key={item.id} className="border-b last:border-0">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1.5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:py-5"
            >
              <span className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {item.source}
                {time && (
                  <>
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.publishedAt}>{time}</time>
                  </>
                )}
                {item.sourcesCount ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{item.sourcesCount} fontes</span>
                  </>
                ) : null}
              </span>
              <span className="text-pretty font-serif text-lg font-bold leading-snug text-foreground md:text-xl">
                {item.title}
              </span>
              {item.description && (
                <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </span>
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
