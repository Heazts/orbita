"use client"

import { useCallback } from "react"
import { useHydratedState } from "@/hooks/use-hydrated-state"

export function useSearchHistory(maxEntries = 6): {
  history: string[]
  addTerm: (term: string) => void
} {
  const [history, setHistory] = useHydratedState<string[]>("orbita-history", [])
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

  return { history, addTerm }
}
