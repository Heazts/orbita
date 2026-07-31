"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { readStore, writeStore, type StoredValueGuard } from "@/lib/storage"

// State hook that mirrors a value in localStorage. On mount it reads the stored
// value (SSR-safe: reads happen in an effect, never during render) and every
// update is written back — but only *after* hydration. Persisting during the
// initial render would overwrite the stored value with the fallback before the
// read had a chance to run, which in a multi-tab session could wipe favorites
// or search history from one tab into another.
// `isValid` is optional but strongly recommended for structured values: the
// stored JSON is untrusted, and without a guard a malformed value is handed
// straight to consumers that assume the declared type.
export function useHydratedState<T>(
  key: string,
  fallback: T,
  isValid?: StoredValueGuard<T>,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setStateInternal] = useState<T>(fallback)
  const fallbackRef = useRef(fallback)
  const validRef = useRef(isValid)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (hydratedRef.current) return
    hydratedRef.current = true
    setStateInternal(readStore<T>(key, fallbackRef.current, validRef.current))
  }, [key])

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const next =
          typeof value === "function" ? (value as (prev: T) => T)(prev) : value
        if (hydratedRef.current) writeStore(key, next)
        return next
      })
    },
    [key],
  )

  return [state, setState]
}
