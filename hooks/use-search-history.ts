"use client"

import { useEffect, useCallback } from "react"
import { writeStore } from "@/lib/storage"
import { useHydratedState } from "@/hooks/use-hydrated-state"

export function useSearchHistory(maxEntries = 6): { history: string[]; addTerm: (term: string) => void } {
  const [history, setHistory] = useHydratedState<string[]>("orbita-history", [])
  const addTerm = useCallback(
    (term: string) => {
      setHistory((current) => {
        const updated = [
          term,
          ...current.filter(
            (existing) =>
              existing.toLocaleLowerCase("pt-BR") !== term.toLocaleLowerCase("pt-BR"),
          ),
        ].slice(0, maxEntries)
        return updated
      })
    },
    [maxEntries, setHistory],
  )

  useEffect(() => {
    writeStore("orbita-history", history)
  }, [history])

  return { history, addTerm }
}
