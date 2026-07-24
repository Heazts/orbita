"use client"

import { useEffect, useRef } from "react"

// Keeps the address bar in sync with the active search term, so a search can be
// shared or bookmarked — the behaviour the JSON-LD SearchAction in app/layout
// advertises (`/?q={search_term_string}`).
//
// History strategy: starting or clearing a search pushes an entry (so Back
// undoes the search), while refining an existing term replaces it — pushing on
// every debounced keystroke would bury the previous page under dozens of
// entries. A popstate listener mirrors external navigation back into the input.
export function useUrlQuery(query: string, onNavigate: (query: string) => void): void {
  // null until the first effect run, so the initial render doesn't rewrite the
  // URL the user arrived with.
  const lastQuery = useRef<string | null>(null)

  useEffect(() => {
    if (lastQuery.current === null) {
      lastQuery.current = query
      return
    }
    if (lastQuery.current === query) return

    const url = new URL(window.location.href)
    if (query) url.searchParams.set("q", query)
    else url.searchParams.delete("q")
    const next = `${url.pathname}${url.search}${url.hash}`
    const previous = lastQuery.current
    lastQuery.current = query

    // Arriving at /?q=termo debounces into the same URL we already have; don't
    // add a duplicate entry that makes Back look broken.
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      return
    }
    const startsOrEndsSearch = !previous || !query
    if (startsOrEndsSearch) window.history.pushState(null, "", next)
    else window.history.replaceState(null, "", next)
  }, [query])

  useEffect(() => {
    const onPopState = () => {
      const fromUrl = new URLSearchParams(window.location.search).get("q")?.trim() ?? ""
      // Record it first so the sync effect above treats this as already applied
      // and doesn't push another entry for a change the browser just made.
      lastQuery.current = fromUrl
      onNavigate(fromUrl)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [onNavigate])
}
