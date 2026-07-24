"use client"

import { Heart, Share2, ExternalLink } from "lucide-react"
import { type NewsItem } from "@/lib/news"
import { IconButton } from "@/components/ui/icon-button"
import { NewsImage } from "@/components/ui/news-image"
import { Highlight } from "@/components/highlight"

function relativeTime(value: string, now: number | null) {
  if (now === null) return ""
  const parsed = Date.parse(value)
  if (isNaN(parsed)) return ""
  const minutes = Math.max(0, Math.round((now - parsed) / 60_000))
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)}h`
  return `há ${Math.floor(minutes / 1440)}d`
}

function isNew(value: string, now: number | null): boolean {
  if (now === null) return false
  return now - Date.parse(value) < 30 * 60_000
}

function Actions({
  item,
  favorite,
  toggleFavorite,
  share,
}: {
  item: NewsItem
  favorite: boolean
  toggleFavorite: () => void
  share: () => void
}) {
  return (
    <div className="relative flex items-center gap-1.5">
      <IconButton
        label={favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
        active={favorite}
        onClick={toggleFavorite}
      >
        <Heart className="size-4" fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
      </IconButton>
      <IconButton label={`Compartilhar ${item.title}`} onClick={share}>
        <Share2 className="size-4" aria-hidden="true" />
      </IconButton>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir no site ${item.source}`}
        className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </div>
  )
}

type NewsCardProps = {
  item: NewsItem
  now: number | null
  query: string
  favorite: boolean
  onFavorite: () => void
  onShare: () => void
  lead?: boolean
}

export function NewsCard({ item, now, query, favorite, onFavorite, onShare, lead = false }: NewsCardProps) {
  const itemIsNew = isNew(item.publishedAt, now)
  // Empty for undated items (publishedAt === "") or before hydration; when empty
  // we drop the time and its separator so no dangling "·" is left behind.
  const time = relativeTime(item.publishedAt, now)

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
        {itemIsNew && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
            Novo
          </span>
        )}
        <span className={lead ? "opacity-80" : "opacity-60"}>{item.category}</span>
        <span className={lead ? "opacity-40" : "opacity-30"} aria-hidden="true">·</span>
        <span className={lead ? "opacity-80" : "opacity-60"}>{item.source}</span>
        {time && (
          <>
            <span className={lead ? "opacity-40" : "opacity-30"} aria-hidden="true">·</span>
            <time dateTime={item.publishedAt} className={lead ? "opacity-80" : "opacity-60"}>
              {time}
            </time>
          </>
        )}
      </div>
      <h2
        className={`text-balance font-serif font-bold leading-tight ${lead ? "text-2xl md:text-4xl lg:text-5xl" : "text-lg md:text-xl"}`}
      >
        <Highlight text={item.title} query={query} />
      </h2>
      {item.description && (
        <p className={`text-pretty leading-relaxed ${lead ? "max-w-3xl text-base opacity-75 md:text-lg" : "text-sm text-muted-foreground"}`}>
          <Highlight text={item.description} query={query} />
        </p>
      )}
      <div className="flex items-center justify-between gap-4 pt-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {item.source} ↗
        </a>
        <Actions item={item} favorite={favorite} toggleFavorite={onFavorite} share={onShare} />
      </div>
    </>
  )

  if (lead) {
    return (
      <article className="group flex flex-col gap-5 overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground transition-shadow hover:shadow-xl md:p-8 lg:p-9">
        {item.image && <NewsImage src={item.image} lead />}
        {content}
      </article>
    )
  }

  return (
    <article className="group flex gap-4 border-b py-5 transition-colors last:border-0 hover:bg-muted/30 md:py-6">
      {item.image && <NewsImage src={item.image} />}
      <div className="flex min-w-0 flex-1 flex-col gap-3">{content}</div>
    </article>
  )
}