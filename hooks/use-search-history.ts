"use client"

import { useCallback } from "react"
import { useHydratedState } from "@/hooks/use-hydrated-state"
import { isStringArray } from "@/lib/guards"

export function useSearchHistory(maxEntries = 6): {
  history: string[]
  addTerm: (term: string) => void
  clearHistory: () => void
} {
  // Guarded: a non-string entry would reach `existing.toLocaleLowerCase(...)`
  // in addTerm and throw.
  const [history, setHistory] = useHydratedState<string[]>("orbita-history", [], isStringArray)
  const addTerm = useCallback(
    (term: string) => {
      setHistory((current) => {
        const trimmed = term.trim()
        if (!trimmed) return current
        return [
          trimmed,
          ...current.filter(
            (existing) =>
              existing.toLocaleLowerCase("pt-BR") !==
              trimmed.toLocaleLowerCase("pt-BR"),
          ),
        ].slice(0, maxEntries)
      })
    },
    [maxEntries, setHistory],
  )

  const clearHistory = useCallback(() => setHistory([]), [setHistory])

  return { history, addTerm, clearHistory }
}
