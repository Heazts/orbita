"use client"

import useSWR from "swr"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Period, Sort } from "@/lib/types"
import { useFavorites } from "@/hooks/use-favorites"
import { useNow } from "@/hooks/use-now"
import { useSearchHistory } from "@/hooks/use-search-history"
import { useDebouncedQuery } from "@/hooks/use-debounced-query"
import { usePreferences } from "@/hooks/use-preferences"
import { useTheme } from "@/hooks/use-theme"
import { useUrlQuery } from "@/hooks/use-url-query"
import {
  FALLBACK_NEWS,
  FEED_SOURCES,
  isHeavyTopic,
  type NewsCategory,
  type NewsItem,
  type NewsResponse,
} from "@/lib/news"
import { QuickSummaryModal } from "@/components/quick-summary-modal"
import { SourcesModal } from "@/components/sources-modal"
import { FinancialTicker } from "@/components/financial-ticker"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { Header } from "@/components/header"
import { Filters } from "@/components/filters"
import { Preferences } from "@/components/preferences"
import { CategoriesNav } from "@/components/categories-nav"
import { NewsList } from "@/components/news-list"
import { Sidebar } from "@/components/sidebar"
import { Ticker } from "@/components/ticker"
import { SearchSuggestions } from "@/components/search-suggestions"
import { PageHeading } from "@/components/page-heading"
import { EmptyState } from "@/components/empty-state"
import { SiteFooter } from "@/components/site-footer"
import { BackToTop } from "@/components/back-to-top"
import {
  ErrorBanner,
  FailedSourcesBanner,
  NewItemsPill,
  NoticeBanner,
} from "@/components/feedback-banners"

const GENERIC_ERROR = "A busca está temporariamente indisponível."

// Surfaces why the request failed so the banner can be specific — a rate-limited
// reader should be told to wait, not that the service is down.
const fetcher = async (url: string): Promise<NewsResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Muitas buscas em pouco tempo. Aguarde alguns instantes."
        : GENERIC_ERROR,
    )
  }
  return response.json()
}

// Period and Sort are imported from @/lib/types (single source of truth).
// They were previously duplicated here and in filters.tsx without export.

// Only these names pass the API's source validation, so the picker must offer
// exactly them: listing sources scraped from the current response both trapped
// the reader (a filtered response only contains the source already selected)
// and offered Google News outlets the API silently ignores.
const SOURCE_OPTIONS = [
  "Todas",
  ...FEED_SOURCES.map((source) => source.name).sort((a, b) => a.localeCompare(b, "pt-BR")),
]

function buildApiUrl(query: string, category: NewsCategory, period: Period, sort: Sort, source: string): string {
  const searchParams = new URLSearchParams()
  if (query) searchParams.set("q", query)
  if (category !== "Todas") searchParams.set("category", category)
  if (period === "live") {
    searchParams.set("period", "1")
    searchParams.set("live", "true")
  } else if (period !== "all") {
    searchParams.set("period", period)
  }
  if (sort !== "latest") searchParams.set("sort", sort)
  if (source !== "Todas") searchParams.set("source", source)
  const queryString = searchParams.toString()
  return `/api/news${queryString ? `?${queryString}` : ""}`
}

type NewsDashboardProps = {
  // Server-fetched default view (see app/page.tsx), used as SWR's fallbackData
  // so the first paint has real headlines instead of a skeleton — independent
  // of client hydration/now(), unlike the synthetic fallback below.
  initialData?: NewsResponse
}

export function NewsDashboard({ initialData }: NewsDashboardProps) {
  const now = useNow()
  const { prefs } = usePreferences()
  // Single theme instance shared by the header toggle and the preferences
  // panel, so both always show the same state.
  const { theme, mode: themeMode, setMode: setThemeMode, toggleTheme } = useTheme()
  const { favorites, favoritesCount, toggleFavorite } = useFavorites()
  const { history, addTerm, clearHistory } = useSearchHistory()
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
  })
  const [category, setCategory] = useState<NewsCategory>("Todas")
  const [period, setPeriod] = useState<Period>("all")
  const [sort, setSort] = useState<Sort>("latest")
  const [source, setSource] = useState("Todas")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [notice, setNotice] = useState("")
  const [newCount, setNewCount] = useState(0)
  const [selectedSummaryItem, setSelectedAiItem] = useState<NewsItem | null>(null)
  const [selectedSourcesItem, setSelectedSourcesItem] = useState<NewsItem | null>(null)
  const previousItemIds = useRef<string[]>([])

  const fallbackItems = useMemo(
    () =>
      now === null
        ? []
        : FALLBACK_NEWS.map((item, index) => ({
            ...item,
            publishedAt: new Date(now - index * 30 * 60_000).toISOString(),
          })),
    [now],
  )

  const query = useDebouncedQuery(input, addTerm)
  // Mirrors the active search in the address bar so it can be shared, and syncs
  // the input back when the reader uses Back/Forward.
  useUrlQuery(query, setInput)

  const isLivePeriod = period === "live"
  const apiUrl = useMemo(
    () => buildApiUrl(query, category, period, sort, source),
    [query, category, period, sort, source],
  )

  // Whether the reader is on the plain, unfiltered view apiUrl is built for
  // (the only one the server pre-fetches). Deliberately not gated on
  // `now !== null`: that gate previously meant fallbackData was only ever
  // used post-hydration, so the server-rendered HTML (and the first client
  // render, which must match it) always showed the loading skeleton instead
  // of any fallback content.
  const isDefaultView = !query && category === "Todas" && period === "all" && source === "Todas"

  // Prefer the server-fetched initialData (real data, valid even during SSR).
  // Only fall back to the synthetic FALLBACK_NEWS-with-fresh-dates once
  // hydrated and no initialData was supplied (e.g. NewsDashboard used without
  // a server-rendering parent).
  const fallbackData = isDefaultView
    ? initialData ??
      (now !== null
        ? { items: fallbackItems, updatedAt: new Date(now).toISOString(), sourceCount: 0, isFallback: true }
        : undefined)
    : undefined

  const { data, error, isLoading, isValidating, mutate } = useSWR<NewsResponse>(apiUrl, fetcher, {
    refreshInterval: isLivePeriod ? 30_000 : 45_000,
    refreshWhenHidden: false,
    dedupingInterval: isLivePeriod ? 15_000 : 5_000,
    fallbackData,
    keepPreviousData: true,
  })

  useEffect(() => {
    const currentIds = (data?.items ?? []).map((item) => item.id)
    if (previousItemIds.current.length > 0 && currentIds.length > 0) {
      const newItems = currentIds.filter((id) => !previousItemIds.current.includes(id))
      if (newItems.length > 0) {
        setNewCount((count) => count + newItems.length)
      }
    }
    previousItemIds.current = currentIds
  }, [data?.items])

  useEffect(() => {
    if (newCount > 0) {
      const timeout = setTimeout(() => setNewCount(0), 10_000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [newCount])

  const tickerItems = useMemo(() => (data?.items ?? []).slice(0, 12), [data?.items])


  // "Equilibrado" hides heavy/pessimistic items while browsing (never while
  // searching or in favorites, where intent is explicit). If that would empty
  // the list, we keep the unfiltered items so the panel is never blank.
  const items = useMemo(() => {
    const base = favoritesOnly
      ? Object.values(favorites).sort(
          (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
        )
      : data?.items ?? []
    if (prefs.tone !== "balanced" || query || favoritesOnly) return base
    const bright = base.filter((item) => !isHeavyTopic(item))
    return bright.length > 0 ? bright : base
  }, [prefs.tone, query, favoritesOnly, favorites, data?.items])

  // Respect the "avisos de novas matérias" preference for both the pill and the
  // header badge.
  const visibleNewCount = prefs.newAlerts ? newCount : 0

  const share = useCallback(async (item: NewsItem) => {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: item.url })
      } else {
        await navigator.clipboard.writeText(item.url)
        setNotice("Link copiado")
      }
    } catch {
      setNotice("Não foi possível compartilhar")
    }
    window.setTimeout(() => setNotice(""), 2500)
  }, [])

  const clear = useCallback(() => {
    setInput("")
    setCategory("Todas")
    setPeriod("all")
    setSort("latest")
    setSource("Todas")
    setFavoritesOnly(false)
  }, [])

  const openPreferences = useCallback(() => {
    setPreferencesOpen(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        input={input}
        onInputChange={setInput}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
        favoritesOnly={favoritesOnly}
        onFavoritesOnlyChange={setFavoritesOnly}
        favoritesCount={favoritesCount}
        isValidating={isValidating}
        hasData={Boolean(data?.items?.length)}
        newCount={visibleNewCount}
        isLive={isLivePeriod}
        onRefresh={() => { setNewCount(0); void mutate() }}
        preferencesOpen={preferencesOpen}
        onPreferencesToggle={() => setPreferencesOpen((open) => !open)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {!query && <SearchSuggestions history={history} onSelect={setInput} />}

      {filtersOpen && (
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Filters
            period={period}
            onPeriodChange={setPeriod}
            sort={sort}
            onSortChange={setSort}
            source={source}
            onSourceChange={setSource}
            sources={SOURCE_OPTIONS}
          />
        </div>
      )}
      {preferencesOpen && (
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Preferences
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            historyCount={history.length}
            onClearHistory={clearHistory}
          />
        </div>
      )}

      {tickerItems.length > 0 && <Ticker items={tickerItems} isLive={isLivePeriod} />}

      <CategoriesNav
        category={category}
        onCategoryChange={(newCategory) => {
          setCategory(newCategory)
          setFavoritesOnly(false)
        }}
      />

      {/* aria-live region: announces result count to screen readers when a
          search completes without requiring the user to navigate to the list. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {!isLoading && !isValidating && `${items.length} notícia${items.length !== 1 ? "s" : ""} encontrada${items.length !== 1 ? "s" : ""}`}
      </div>

      <main id="conteudo-principal" className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 md:py-8">
        {visibleNewCount > 0 && !favoritesOnly && !query && <NewItemsPill count={visibleNewCount} />}

        <PageHeading
          favoritesOnly={favoritesOnly}
          isLive={isLivePeriod}
          query={query}
          count={items.length}
          busy={isLoading || isValidating}
          updatedAt={data?.updatedAt}
          now={now}
        />

        {notice && <NoticeBanner notice={notice} />}

        {category === "Economia" && <FinancialTicker />}

        {error && (
          <ErrorBanner
            message={error instanceof Error ? error.message : GENERIC_ERROR}
            onRetry={() => void mutate()}
          />
        )}

        {!favoritesOnly && data?.failedSources?.length ? (
          <FailedSourcesBanner sources={data.failedSources} />
        ) : null}

        {isLoading && items.length === 0 ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.65fr)]">
            <section className="flex flex-col gap-2">
              {!query && !favoritesOnly && <SkeletonCard lead />}
              {Array.from({ length: 5 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </section>
          </div>
        ) : items.length === 0 ? (
          <EmptyState onClear={clear} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.65fr)]">
            <NewsList
              items={items}
              now={now}
              query={query}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onShare={(item) => void share(item)}
              onQuickSummary={setSelectedAiItem}
              onShowSources={setSelectedSourcesItem}
            />
            <Sidebar onClear={clear} />
          </div>
        )}
      </main>

      {selectedSummaryItem && (
        <QuickSummaryModal item={selectedSummaryItem} onClose={() => setSelectedAiItem(null)} />
      )}

      {selectedSourcesItem && (
        <SourcesModal item={selectedSourcesItem} onClose={() => setSelectedSourcesItem(null)} />
      )}

      <SiteFooter onOpenPreferences={openPreferences} />
      <BackToTop />
    </div>
  )
}
