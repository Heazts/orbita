"use client"

import { useCallback, useMemo, useState } from "react"
import type { NewsCategory } from "@/lib/news"
import type { Period, Sort } from "@/lib/types"
import { useDebouncedQuery } from "@/hooks/use-debounced-query"
import { useUrlQuery } from "@/hooks/use-url-query"

export type NewsFilters = {
  input: string
  setInput: (value: string) => void
  category: NewsCategory
  setCategory: (value: NewsCategory) => void
  period: Period
  setPeriod: (value: Period) => void
  sort: Sort
  setSort: (value: Sort) => void
  source: string
  setSource: (value: string) => void
  favoritesOnly: boolean
  setFavoritesOnly: (value: boolean) => void
  /** Debounced `input`; this is what the API is actually queried with. */
  query: string
  apiUrl: string
  isLivePeriod: boolean
  /** True on the plain, unfiltered view — the only one the server pre-fetches. */
  isDefaultView: boolean
  clear: () => void
}

/**
 * Everything that decides *which* news the reader is looking at.
 *
 * Pulled out of the dashboard, which held six of these as loose useState calls
 * among seven unrelated ones. Grouping them makes the invariant visible: the
 * API URL and "is this the default view" are derived from exactly this set and
 * nothing else, so a filter added here cannot be forgotten in either.
 */
export function useNewsFilters(addSearchTerm: (term: string) => void): NewsFilters {
  const [input, setInput] = useState(() => {
    // Seeded from the URL so a shared link opens on its search, and read
    // lazily because window does not exist during the server render.
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
  })
  const [category, setCategory] = useState<NewsCategory>("Todas")
  const [period, setPeriod] = useState<Period>("all")
  const [sort, setSort] = useState<Sort>("latest")
  const [source, setSource] = useState("Todas")
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  const query = useDebouncedQuery(input, addSearchTerm)
  // Mirrors the active search in the address bar so it can be shared, and syncs
  // the input back when the reader uses Back/Forward.
  useUrlQuery(query, setInput)

  const apiUrl = useMemo(
    () => buildApiUrl(query, category, period, sort, source),
    [query, category, period, sort, source],
  )

  const clear = useCallback(() => {
    setInput("")
    setCategory("Todas")
    setPeriod("all")
    setSort("latest")
    setSource("Todas")
    setFavoritesOnly(false)
  }, [])

  return {
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
    isLivePeriod: period === "live",
    // Must agree with the isDefaultView in lib/aggregate.ts, which decides
    // whether the server applies curateHomepage. `sort` was missing here: with
    // sort=relevance and no search this said "default", so the dashboard seeded
    // SWR with the curated server payload and then received the uncurated one,
    // visibly reshuffling the cards after first paint. It also picks between the
    // "sources are down" and "your filters matched nothing" empty states, which
    // that combination got wrong for the same reason.
    isDefaultView:
      !query && category === "Todas" && period === "all" && source === "Todas" && sort === "latest",
    clear,
  }
}

/**
 * Builds the /api/news query string.
 *
 * Exported for tests: the mapping between UI state and query parameters is the
 * contract between this hook and the route, and it is easy to break silently.
 */
export function buildApiUrl(
  query: string,
  category: NewsCategory,
  period: Period,
  sort: Sort,
  source: string,
): string {
  const searchParams = new URLSearchParams()
  if (query) searchParams.set("q", query)
  if (category !== "Todas") searchParams.set("category", category)
  if (period === "live") {
    // "live" is a UI period that maps to a 1-day window plus a flag; the API
    // has no "live" period of its own.
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
