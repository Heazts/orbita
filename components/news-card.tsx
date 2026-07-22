"use client"

import { Heart, Share2, ExternalLink } from "lucide-react"
import { type NewsItem } from "@/lib/news"
import { IconButton } from "@/components/ui/icon-button"
import { NewsImage } from "@/components/ui/news-image"
import { Highlight } from "@/components/highlight"

function relativeTime(value: string, now: number | null) {
  if (now === null) return ""
  const minutes = Math.max(0, Math.round((now - Date.parse(value)) / 60_000))
  if (minutes < 1) return "agora"
  if (minutes < 60) return `há ${minutes} min`
  if (minutes < 1440) return `há ${Math.floor(minutes / 60)}h`
  return `há ${Math.floor(minutes / 1440)}d`
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
    <div className="relative flex items-center gap-2">
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
  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70">
        <span>{item.category}</span>
        <span aria-hidden="true">•</span>
        <span>{item.source}</span>
        <span aria-hidden="true">•</span>
        <time dateTime={item.publishedAt}>{relativeTime(item.publishedAt, now)}</time>
      </div>
      <h2
        className={`text-balance font-serif font-bold leading-tight ${lead ? "text-3xl md:text-5xl" : "text-xl md:text-2xl"}`}
      >
        <Highlight text={item.title} query={query} />
      </h2>
      {item.description && (
        <p className={`text-pretty leading-relaxed ${lead ? "max-w-3xl opacity-75" : "text-sm text-muted-foreground"}`}>
          <Highlight text={item.description} query={query} />
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs opacity-60">Fonte original</span>
        <Actions item={item} favorite={favorite} toggleFavorite={onFavorite} share={onShare} />
      </div>
    </>
  )

  if (lead) {
    return (
      <article className="flex flex-col gap-5 rounded-xl bg-primary p-6 text-primary-foreground md:p-9">
        {item.image && <NewsImage src={item.image} lead />}
        {content}
      </article>
    )
  }

  return (
    <article className="flex gap-4 border-b py-6 last:border-0">
      {item.image && <NewsImage src={item.image} />}
      <div className="flex min-w-0 flex-1 flex-col gap-4">{content}</div>
    </article>
  )
}
