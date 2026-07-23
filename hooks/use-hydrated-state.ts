"use client"

import { useEffect, useRef, useState } from "react"
import { readStore } from "@/lib/storage"

export function useHydratedState<T>(key: string, fallback: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(fallback)
  const fallbackRef = useRef(fallback)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      setState(readStore<T>(key, fallbackRef.current))
    }
  }, [key])

  return [state, setState]
}
