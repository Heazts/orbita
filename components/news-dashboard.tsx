"use client"

import useSWR from "swr"
import dynamic from "next/dynamic"
import { useCallback, useMemo, useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { useNow } from "@/hooks/use-now"
import { useSearchHistory } from "@/hooks/use-search-history"
import { usePreferences } from "@/hooks/use-preferences"
import { useTheme } from "@/hooks/use-theme"
import { useNewsFilters } from "@/hooks/use-news-filters"
import { useNewItemsCount } from "@/hooks/use-new-items-count"
import { useNotice } from "@/hooks/use-notice"
import {
  FEED_SOURCES,
  isHeavyTopic,
  type NewsItem,
  type NewsResponse,
} from "@/lib/news"
// Split out of the initial bundle: these only mount after a card action, so
// their code (and the shared Modal primitive) is not on the critical path for
// readers who never open one. ssr:false because a modal can never be part of
// the first paint — it opens on a click.
//
// Measured, not assumed: pnpm check:bundle reports the effect on every PR.
const QuickSummaryModal = dynamic(
  () => import("@/components/quick-summary-modal").then((module) => module.QuickSummaryModal),
  { ssr: false },
)
const SourcesModal = dynamic(
  () => import("@/components/sources-modal").then((module) => module.SourcesModal),
  { ssr: false },
)
import { FinancialTicker } from "@/components/financial-ticker"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { Header } from "@/components/header"
// Collapsed panels, closed on first paint. ssr stays on: unlike a modal these
// are plain panels that could legitimately render on the server if their open
// state ever moves into the URL.
const Filters = dynamic(() => import("@/components/filters").then((module) => module.Filters))
const Preferences = dynamic(() =>
  import("@/components/preferences").then((module) => module.Preferences),
)
import { CategoriesNav } from "@/components/categories-nav"
import { NewsList } from "@/components/news-list"
import { Sidebar } from "@/components/sidebar"
import { Ticker } from "@/components/ticker"
import { SearchSuggestions } from "@/components/search-suggestions"
import { PageHeading } from "@/components/page-heading"
import { EmptyState, SourcesDownState } from "@/components/empty-state"
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
  // Grouped into hooks by what they are for, rather than thirteen useState
  // calls in a row with no indication of which belong together.
  const filters = useNewsFilters(addTerm)
  const {
    input,
    setInput,
    category,
    setCategory,
    period,
    setPeriod,
    sort,
    setSort,
    source,
    setSource,
    favoritesOnly,
    setFavoritesOnly,
    query,
    apiUrl,
    isLivePeriod,
    isDefaultView,
    clear,
  } = filters
  const { notice, showNotice } = useNotice()

  // Purely presentational: which panel or modal is open.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<NewsItem | null>(null)
  const [selectedSourcesItem, setSelectedSourcesItem] = useState<NewsItem | null>(null)

  // Seeds SWR with the server-rendered page data so the first paint has real
  // headlines. There is deliberately no synthetic stand-in when initialData is
  // absent: SWR then reports isLoading and the skeletons show, which is what is
  // actually happening. The old branch here filled the gap with four invented
  // articles carrying real outlets' names.
  const fallbackData = isDefaultView ? initialData : undefined

  const { data, error, isLoading, isValidating, mutate } = useSWR<NewsResponse>(apiUrl, fetcher, {
    refreshInterval: isLivePeriod ? 30_000 : 45_000,
    refreshWhenHidden: false,
    dedupingInterval: isLivePeriod ? 15_000 : 5_000,
    fallbackData,
    keepPreviousData: true,
  })

  const { newCount, resetCount } = useNewItemsCount(data?.items)

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


  const share = useCallback(
    async (item: NewsItem) => {
      try {
        if (navigator.share) {
          await navigator.share({ title: item.title, url: item.url })
          // Nothing to announce: the OS share sheet already gave feedback, and
          // the previous code still started a timer here for an empty notice.
          return
        }
        await navigator.clipboard.writeText(item.url)
        showNotice("Link copiado")
      } catch (error) {
        // Dismissing the OS share sheet rejects with AbortError. That is the
        // reader deciding not to share, not a failure, and telling them
        // "Não foi possível compartilhar" blames them for their own choice.
        if (error instanceof DOMException && error.name === "AbortError") return
        showNotice("Não foi possível compartilhar")
      }
    },
    [showNotice],
  )


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
        onRefresh={() => { resetCount(); void mutate() }}
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
          // An outage and an over-narrow filter both end up here, and telling
          // someone to "limpar os filtros" when no filter is set sends them
          // looking for a mistake they did not make.
          data?.sourcesUnavailable || (isDefaultView && !favoritesOnly) ? (
            <SourcesDownState failedSources={data?.failedSources} onRetry={() => void mutate()} />
          ) : (
            <EmptyState onClear={clear} />
          )
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.65fr)]">
            {/* Every handler below is passed by reference. An inline arrow
                here would be a new function on each render and would defeat
                the cards' memo for that prop, re-rendering all of them. */}
            <NewsList
              items={items}
              now={now}
              query={query}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onShare={share}
              onQuickSummary={setSelectedSummaryItem}
              onShowSources={setSelectedSourcesItem}
            />
            <Sidebar onClear={clear} />
          </div>
        )}
      </main>

      {selectedSummaryItem && (
        <QuickSummaryModal item={selectedSummaryItem} onClose={() => setSelectedSummaryItem(null)} />
      )}

      {selectedSourcesItem && (
        <SourcesModal item={selectedSourcesItem} onClose={() => setSelectedSourcesItem(null)} />
      )}

      <SiteFooter onOpenPreferences={openPreferences} />
      <BackToTop />
    </div>
  )
}
