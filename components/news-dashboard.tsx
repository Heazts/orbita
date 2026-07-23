"use client"

import useSWR from "swr"
import { ArrowUp, Check, Clock3, RefreshCw, Search } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { useNow } from "@/hooks/use-now"
import { useSearchHistory } from "@/hooks/use-search-history"
import { useDebouncedQuery } from "@/hooks/use-debounced-query"
import { FALLBACK_NEWS, type NewsCategory, type NewsItem, type NewsResponse } from "@/lib/news"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { Header } from "@/components/header"
import { Filters } from "@/components/filters"
import { CategoriesNav } from "@/components/categories-nav"
import { NewsList } from "@/components/news-list"
import { Sidebar } from "@/components/sidebar"
import { Ticker } from "@/components/ticker"

const fetcher = async (url: string): Promise<NewsResponse> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Não foi possível pesquisar agora.")
  return response.json()
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
})

const SUGGESTIONS = [
  "Inteligência artificial",
  "Brasil",
  "Economia mundial",
  "Mudanças climáticas",
  "Eleições",
  "Espaço",
]

const CURRENT_YEAR = new Date().getFullYear()

type Period = "all" | "1" | "7" | "30" | "live"
type Sort = "latest" | "relevance"

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

export function NewsDashboard() {
  const now = useNow()
  const { favorites, favoritesCount, toggleFavorite } = useFavorites()
  const { history, addTerm } = useSearchHistory()
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
  })
  const [category, setCategory] = useState<NewsCategory>("Todas")
  const [period, setPeriod] = useState<Period>("all")
  const [sort, setSort] = useState<Sort>("latest")
  const [source, setSource] = useState("Todas")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [notice, setNotice] = useState("")
  const [showTop, setShowTop] = useState(false)
  const [newCount, setNewCount] = useState(0)
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

  const isLivePeriod = period === "live"
  const apiUrl = useMemo(
    () => buildApiUrl(query, category, period, sort, source),
    [query, category, period, sort, source],
  )

  const showFallback =
    now !== null && !query && category === "Todas" && period === "all" && source === "Todas"

  const { data, error, isLoading, isValidating, mutate } = useSWR<NewsResponse>(apiUrl, fetcher, {
    refreshInterval: isLivePeriod ? 30_000 : 45_000,
    refreshWhenHidden: false,
    dedupingInterval: isLivePeriod ? 15_000 : 5_000,
    fallbackData: showFallback
      ? {
          items: fallbackItems,
          updatedAt: new Date(now).toISOString(),
          sourceCount: 0,
          isFallback: true,
        }
      : undefined,
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

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const sources = useMemo(
    () => ["Todas", ...Array.from(new Set((data?.items ?? []).map((item) => item.source))).sort()],
    [data?.items],
  )

  const tickerItems = useMemo(() => (data?.items ?? []).slice(0, 12), [data?.items])

  const items = favoritesOnly
    ? Object.values(favorites).sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      )
    : data?.items ?? []

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
        newCount={newCount}
        isLive={isLivePeriod}
        onRefresh={() => { setNewCount(0); void mutate() }}
      />
      {!query && (
        <div className="mx-auto max-w-7xl px-5 pt-3 md:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...history, ...SUGGESTIONS]
              .filter((term, index, all) => all.indexOf(term) === index)
              .slice(0, 8)
              .map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setInput(term)}
                  className="shrink-0 rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  {term}
                </button>
              ))}
          </div>
        </div>
      )}
      {filtersOpen && (
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Filters
            period={period}
            onPeriodChange={setPeriod}
            sort={sort}
            onSortChange={setSort}
            source={source}
            onSourceChange={setSource}
            sources={sources}
          />
        </div>
      )}

      {tickerItems.length > 0 && <Ticker items={tickerItems} isLive={isLivePeriod} now={now} />}

      <CategoriesNav
        category={category}
        onCategoryChange={(newCategory) => {
          setCategory(newCategory)
          setFavoritesOnly(false)
        }}
      />

      <main id="conteudo" className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 md:py-8">
        {newCount > 0 && !favoritesOnly && !query && (
          <button
            type="button"
            onClick={() => { setNewCount(0); void mutate() }}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/20"
          >
            <RefreshCw className="size-4" />
            {newCount} {newCount === 1 ? "nova matéria" : "novas matérias"} — clique para atualizar
          </button>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-destructive">
              {favoritesOnly
                ? "Sua coleção"
                : isLivePeriod
                  ? "Transmissão ao vivo"
                  : query
                    ? "Pesquisa global"
                    : "Edição contínua"}
            </p>
            <h1 className="text-balance font-serif text-3xl font-bold md:text-4xl">
              {favoritesOnly
                ? "Favoritos"
                : query
                  ? `Resultados para "${query}"`
                  : "Notícias em destaque"}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="size-4" />
            {isLoading || isValidating
              ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block size-1.5 rounded-full bg-destructive motion-safe:animate-pulse" />
                    Buscando...
                  </span>
                )
              : `${items.length} matérias · ${timeFormatter.format(new Date(data?.updatedAt ?? now ?? 0))}`}
          </div>
        </div>

        {notice && (
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-lg border bg-muted p-3 text-sm">
            <Check className="size-4" />
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <RefreshCw className="size-4 text-destructive" />
            </div>
            <div>
              <p className="font-medium">A busca está temporariamente indisponível.</p>
              <p className="text-xs text-muted-foreground">Tente novamente em alguns instantes.</p>
            </div>
            <button
              type="button"
              onClick={() => void mutate()}
              className="ml-auto shrink-0 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!favoritesOnly && data?.failedSources?.length ? (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <span className="inline-block size-1.5 shrink-0 rounded-full bg-amber-500" />
            Algumas fontes estão indisponíveis no momento: {data.failedSources.join(", ")}.
          </div>
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
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/50 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <Search className="size-7 text-muted-foreground" />
            </div>
            <h2 className="font-serif text-2xl font-bold">Nenhuma notícia encontrada</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tente usar menos palavras, outro período ou limpar os filtros para ver mais resultados.
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Limpar tudo
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.65fr)]">
            <NewsList
              items={items}
              now={now}
              query={query}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onShare={(item) => void share(item)}
            />
            <Sidebar onClear={clear} />
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center md:px-8 md:py-8">
          <p className="font-medium">© {CURRENT_YEAR} Órbita Notícias</p>
          <p>Feito com feeds RSS públicos e Google News</p>
        </div>
      </footer>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Voltar ao topo"
          className="fixed bottom-6 right-6 z-30 flex size-11 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowUp className="size-5" />
        </button>
      )}
    </div>
  )
}
