"use client"

import { useEffect, useCallback } from "react"

export function useSearchShortcut(inputRef: React.RefObject<HTMLInputElement | null>) {
  const handleShortcut = useCallback((event: KeyboardEvent) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
    const target = event.target as HTMLElement | null
    if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return
    event.preventDefault()
    inputRef.current?.focus()
  }, [inputRef])

  useEffect(() => {
    window.addEventListener("keydown", handleShortcut)
    return () => window.removeEventListener("keydown", handleShortcut)
  }, [handleShortcut])
}

