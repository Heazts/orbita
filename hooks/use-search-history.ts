"use client"

import { useCallback, useEffect, useState } from "react"
import { readStore, writeStore } from "@/lib/storage"

export function useSearchHistory(maxEntries = 6): { history: string[]; addTerm: (term: string) => void } {
  const [history, setHistory] = useState<string[]>([])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(readStore<string[]>("orbita-history", []))
  }, [])
  // Stable identity via useCallback: this is called from the caller's
  // debounce effect, and an unstable function reference in that effect's
  // dependency array would re-run (and reset) the debounce timer on every
  // unrelated render, not just when the search input actually changes.
  const addTerm = useCallback((term: string) => {
    setHistory((current) => {
      const updated = [
        term,
        ...current.filter((existing) => existing.toLocaleLowerCase("pt-BR") !== term.toLocaleLowerCase("pt-BR")),
      ].slice(0, maxEntries)
      writeStore("orbita-history", updated)
      return updated
    })
  }, [maxEntries])
  return { history, addTerm }
}
