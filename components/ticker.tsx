import type { NewsItem } from "@/lib/news"

type TickerProps = {
  items: NewsItem[]
}

export function Ticker({ items }: TickerProps) {
  return (
    <div
      className="ticker border-b bg-primary text-primary-foreground"
      aria-label="Últimas manchetes"
      aria-live="polite"
    >
      <div className="ticker-track flex w-max items-center gap-10 py-2 text-xs font-bold uppercase tracking-wider">
        {[...items, ...items].map((item, index) => {
          const isDuplicate = index >= items.length
          return (
            <a
              key={`${item.id}-${index}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-hidden={isDuplicate || undefined}
              tabIndex={isDuplicate ? -1 : undefined}
              className="hover:underline"
            >
              <span className="mr-3 text-destructive" aria-hidden="true">●</span>
              {item.title}
            </a>
          )
        })}
      </div>
    </div>
  )
}
