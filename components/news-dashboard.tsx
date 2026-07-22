"use client"

import useSWR from "swr"
import {
  ArrowUp,
  Bookmark,
  Check,
  Clock3,
  Moon,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useFavorites } from "@/hooks/use-favorites"
import { useNow } from "@/hooks/use-now"
import { useSearchHistory } from "@/hooks/use-search-history"
import { useTheme } from "@/hooks/use-theme"
import { FALLBACK_NEWS, NEWS_CATEGORIES, type NewsCategory, type NewsItem, type NewsResponse } from "@/lib/news"
import { IconButton } from "@/components/ui/icon-button"
import { SkeletonCard } from "@/components/ui/skeleton-card"
import { NewsCard } from "@/components/news-card"
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

type Period = "all" | "1" | "7" | "30"
type Sort = "latest" | "relevance"

export function NewsDashboard() {
  const searchRef = useRef<HTMLInputElement>(null)
  const now = useNow()
  const { favorites, favoritesCount, toggleFavorite } = useFavorites()
  const { history, addTerm } = useSearchHistory()
  const { theme, toggleTheme } = useTheme()
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
  })
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<NewsCategory>("Todas")
  const [period, setPeriod] = useState<Period>("all")
  const [sort, setSort] = useState<Sort>("latest")
  const [source, setSource] = useState("Todas")
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [notice, setNotice] = useState("")
  const [showTop, setShowTop] = useState(false)

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

  const searchParams = new URLSearchParams()
  if (query) searchParams.set("q", query)
  if (category !== "Todas") searchParams.set("category", category)
  if (period !== "all") searchParams.set("period", period)
  if (sort !== "latest") searchParams.set("sort", sort)
  if (source !== "Todas") searchParams.set("source", source)
  const queryString = searchParams.toString()
  const apiUrl = `/api/news${queryString ? `?${queryString}` : ""}`
  const showFallback =
    now !== null && !query && category === "Todas" && period === "all" && source === "Todas"
  const { data, error, isLoading, isValidating, mutate } = useSWR<NewsResponse>(apiUrl, fetcher, {
    refreshInterval: 5 * 60_000,
    refreshWhenHidden: false,
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
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = input.trim()
      setQuery(next)
      if (next.length > 1) addTerm(next)
    }, 450)
    return () => window.clearTimeout(timeout)
  }, [input, addTerm])

  const sources = useMemo(
    () => ["Todas", ...Array.from(new Set((data?.items ?? []).map((item) => item.source))).sort()],
    [data?.items],
  )

  const tickerItems = useMemo(() => (data?.items ?? []).slice(0, 8), [data?.items])

  const items = favoritesOnly
    ? Object.values(favorites).sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      )
    : data?.items ?? []

  const share = async (item: NewsItem) => {
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
  }

  const clear = () => {
    setInput("")
    setQuery("")
    setCategory("Todas")
    setPeriod("all")
    setSort("latest")
    setSource("Todas")
    setFavoritesOnly(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 md:px-8">
          <a
            href="#conteudo"
            className="flex items-center gap-3"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              O
            </span>
            <span className="font-serif text-xl font-bold">ÓRBITA</span>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold uppercase md:flex">
              <span className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" />
              Ao vivo
            </span>
            <IconButton
              label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </IconButton>
            <IconButton label="Atualizar notícias" onClick={() => void mutate()}>
              <RefreshCw className={`size-4 ${isValidating ? "motion-safe:animate-spin" : ""}`} />
            </IconButton>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-4 md:px-8">
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border bg-muted px-4 py-3 focus-within:ring-2 focus-within:ring-ring">
              <Search className="size-5 text-muted-foreground" />
              <span className="sr-only">Pesquisar notícias em toda a internet</span>
              <input
                ref={searchRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                type="search"
                maxLength={120}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Pesquise qualquer assunto, lugar ou pessoa... (atalho: /)"
              />
              {input && (
                <button
                  type="button"
                  onClick={() => setInput("")}
                  aria-label="Limpar pesquisa"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>
            <IconButton
              label="Abrir filtros"
              active={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <SlidersHorizontal className="size-4" />
            </IconButton>
            <div className="relative">
              <IconButton
                label="Ver favoritos"
                active={favoritesOnly}
                onClick={() => setFavoritesOnly((value) => !value)}
              >
                <Bookmark className="size-4" />
              </IconButton>
              {favoritesCount > 0 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
                >
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </div>
          </div>
          {!query && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
          )}
          {filtersOpen && (
            <div className="mt-3 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs font-bold">
                Período
                <select
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as Period)}
                  className="rounded-lg border bg-background p-2 text-sm font-normal"
                >
                  <option value="all">Qualquer data</option>
                  <option value="1">Últimas 24 horas</option>
                  <option value="7">Últimos 7 dias</option>
                  <option value="30">Últimos 30 dias</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                Ordenar
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as Sort)}
                  className="rounded-lg border bg-background p-2 text-sm font-normal"
                >
                  <option value="latest">Mais recentes</option>
                  <option value="relevance">Mais relevantes</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                Fonte
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="rounded-lg border bg-background p-2 text-sm font-normal"
                >
                  {sources.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      </header>

      {tickerItems.length > 0 && <Ticker items={tickerItems} />}

      <nav aria-label="Categorias" className="border-b">
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-5 md:px-8">
          {NEWS_CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCategory(item)
                setFavoritesOnly(false)
              }}
              aria-pressed={category === item}
              className="shrink-0 border-b-2 border-transparent px-4 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground aria-pressed:border-primary aria-pressed:text-foreground"
            >
              {item}
            </button>
          ))}
        </div>
      </nav>

      <main id="conteudo" className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-destructive">
              {favoritesOnly ? "Sua coleção" : query ? "Pesquisa global" : "Edição contínua"}
            </p>
            <h1 className="text-balance font-serif text-3xl font-bold">
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
              ? "Buscando..."
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
          <p role="alert" className="rounded-lg border bg-muted p-4 text-sm">
            A busca está temporariamente indisponível. Tente novamente.
          </p>
        )}

        {!favoritesOnly && data?.failedSources?.length ? (
          <p role="status" className="rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
            Algumas fontes estão indisponíveis no momento: {data.failedSources.join(", ")}.
          </p>
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
          <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border bg-muted p-8 text-center">
            <Search className="size-7" />
            <h2 className="font-serif text-2xl font-bold">Nenhuma notícia encontrada</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Tente usar menos palavras, outro período ou limpar os filtros.
            </p>
            <button
              type="button"
              onClick={clear}
              className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground"
            >
              Limpar tudo
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.65fr)]">
            <section className="flex flex-col">
              {items.map((item, index) => (
                <NewsCard
                  key={item.id}
                  item={item}
                  now={now}
                  query={query}
                  lead={index === 0 && !query && !favoritesOnly}
                  favorite={Boolean(favorites[item.id])}
                  onFavorite={() => toggleFavorite(item)}
                  onShare={() => void share(item)}
                />
              ))}
            </section>
            <aside className="h-fit rounded-xl bg-primary p-6 text-primary-foreground lg:sticky lg:top-40">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60">
                Explore melhor
              </p>
              <h2 className="mt-3 font-serif text-3xl font-bold">O mundo em perspectiva.</h2>
              <p className="mt-4 text-sm leading-relaxed opacity-70">
                Pesquise notícias indexadas pelo Google News, filtre por período e salve matérias
                importantes neste navegador.
              </p>
              <button
                type="button"
                onClick={clear}
                className="mt-6 rounded-full border border-primary-foreground/30 px-4 py-2 text-xs font-bold"
              >
                Limpar busca e filtros
              </button>
            </aside>
          </div>
        )}
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl justify-between gap-4 px-5 py-8 text-xs text-muted-foreground md:px-8">
          <p>© {CURRENT_YEAR} Órbita Notícias</p>
          <p>Resultados via RSS público e Google News.</p>
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
