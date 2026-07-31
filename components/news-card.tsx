"use client"

import { memo, useMemo } from "react"
import { Heart, Share2, ExternalLink, FileText, Users } from "lucide-react"
import { getCategoryBadgeStyle, type NewsItem } from "@/lib/news"
import { classifyTone } from "@/lib/summary"
import { IconButton } from "@/components/ui/icon-button"
import { NewsImage } from "@/components/ui/news-image"
import { Highlight } from "@/components/highlight"

function Actions({
  item,
  favorite,
  toggleFavorite,
  share,
  onQuickSummary,
}: {
  item: NewsItem
  favorite: boolean
  toggleFavorite: () => void
  share: () => void
  onQuickSummary?: () => void
}) {
  return (
    <div className="relative flex items-center gap-1.5">
      {onQuickSummary && (
        // FileText, not a robot: the feature extracts sentences from the feed,
        // it does not generate anything. The label was corrected when the
        // "IA Local" naming went away; the icon was missed and kept promising
        // something the code never did.
        <IconButton label="Resumo rápido" onClick={onQuickSummary}>
          <FileText className="size-4 text-primary" aria-hidden="true" />
        </IconButton>
      )}
      <IconButton
        label={favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
        active={favorite}
        onClick={toggleFavorite}
      >
        <Heart className="size-4" fill={favorite ? "currentColor" : "none"} aria-hidden="true" />
      </IconButton>
      <IconButton label={`Compartilhar "${item.title}"`} onClick={share}>
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
  /**
   * Already formatted by the list. Passing the rendered string instead of the
   * raw `now` timestamp is what lets memo do its job: `now` ticks every 60s and
   * would invalidate every card, while this string changes only when the card's
   * displayed age actually changes. Empty for undated items or before
   * hydration, in which case the time and its separator are dropped so no
   * dangling "·" is left behind.
   */
  time: string
  isNew: boolean
  query: string
  favorite: boolean
  /**
   * Handlers take the item so the list can pass one stable function to every
   * card. They used to be zero-argument closures built inside the list's map,
   * which meant four fresh functions per card on every render — memo compared
   * them, found them different, and re-rendered all 100 cards anyway.
   */
  onFavorite: (item: NewsItem) => void
  onShare: (item: NewsItem) => void
  onQuickSummary?: (item: NewsItem) => void
  onShowSources?: (item: NewsItem) => void
  lead?: boolean
  // Position in the list, used only for the entrance-animation cascade.
  staggerIndex?: number
}

function NewsCardComponent({
  item,
  time,
  isNew: itemIsNew,
  query,
  favorite,
  onFavorite,
  onShare,
  onQuickSummary,
  onShowSources,
  lead = false,
  staggerIndex,
}: NewsCardProps) {
  // A fixed class (.stagger-0..8 in globals.css), not a `style="--stagger:N"`
  // attribute — the CSP's style-src 'self' has no 'unsafe-inline'/hashes, so
  // inline style attributes are silently dropped by the browser.
  const staggerClass = staggerIndex === undefined ? "" : ` stagger-${Math.min(staggerIndex, 8)}`
  // Only flagged when notable — routine "Informativo" stories (the vast
  // majority) don't need an extra badge competing with the category color.
  //
  // Memoised because classifyTone normalises and runs four regexes over the
  // title, description and source. Cheap once, but it ran on every render of
  // every card, and the result only depends on the item.
  const tone = useMemo(() => classifyTone(item), [item])

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
        {itemIsNew && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
            Novo
          </span>
        )}
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${getCategoryBadgeStyle(lead)}`}>
          {item.category}
        </span>
        {tone !== "Informativo" && (
          <span className="inline-flex items-center rounded-full border border-dashed border-foreground/30 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-foreground/70">
            {tone}
          </span>
        )}
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
        {item.sourcesCount ? (
          <>
            <span className={lead ? "opacity-40" : "opacity-30"} aria-hidden="true">·</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onShowSources?.(item)
              }}
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary transition-all hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Clique para ver os veículos de imprensa que cobrem esta notícia"
            >
              <Users className="size-3" aria-hidden="true" />
              {item.sourcesCount} fontes
            </button>
          </>
        ) : null}
      </div>
      <h2
        className={`text-balance font-serif font-bold leading-tight ${lead ? "text-2xl md:text-4xl lg:text-5xl" : "text-lg md:text-xl"}`}
      >
        <Highlight text={item.title} query={query} />
      </h2>
      {item.description && (
        <p className={`text-pretty leading-relaxed ${lead ? "line-clamp-3 max-w-3xl text-base opacity-75 md:text-lg" : "line-clamp-2 text-sm text-muted-foreground"}`}>
          <Highlight text={item.description} query={query} />
        </p>
      )}
      <div className="flex items-center justify-between gap-4 pt-1">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ler em ${item.source}`}
          className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {item.source} ↗
        </a>
        <Actions
          item={item}
          favorite={favorite}
          toggleFavorite={() => onFavorite(item)}
          share={() => onShare(item)}
          onQuickSummary={onQuickSummary && (() => onQuickSummary(item))}
        />
      </div>
    </>
  )

  if (lead) {
    return (
      <article className={`group flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm transition-all hover:shadow-md md:p-8 lg:p-9${staggerClass}`}>
        {item.image && (
          // Lead card: use the article title as alt text since the image has
          // editorial relevance (it's the hero visual for this story).
          <NewsImage src={item.image} alt={item.title} lead />
        )}
        {content}
      </article>
    )
  }

  return (
    <article className={`group flex gap-4 border-b py-5 transition-colors last:border-0 hover:bg-muted/30 md:py-6${staggerClass}`}>
      {item.image && (
        // Thumbnail images are decorative — the title and description convey
        // the same information, so alt="" is correct for non-lead cards.
        <NewsImage src={item.image} alt="" />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-3">{content}</div>
    </article>
  )
}

/**
 * Memoised with the default shallow comparison.
 *
 * The list renders up to 100 of these. Before this, every keystroke in the
 * search box and every 60-second tick of the clock re-rendered all of them,
 * because the dashboard owns both and nothing below it was memoised. The props
 * above were reshaped specifically so shallow comparison works: derived strings
 * instead of a shared ticking timestamp, and stable handlers instead of
 * per-card closures.
 */
export const NewsCard = memo(NewsCardComponent)