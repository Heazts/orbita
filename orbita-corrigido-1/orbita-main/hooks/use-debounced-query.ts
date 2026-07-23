"use client"

import { useEffect, useState } from "react"

export function useDebouncedQuery(input: string, addTerm: (term: string) => void, delayMs = 450): string {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = input.trim()
      setQuery(next)
      if (next.length > 1) addTerm(next)
    }, delayMs)
    return () => window.clearTimeout(timeout)
  }, [input, addTerm, delayMs])

  return query
}

