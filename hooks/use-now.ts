"use client"

import { useEffect, useRef, useState } from "react"

export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null)
  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      setNow(Date.now())
    }
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(interval)
  }, [intervalMs])

  return now
}
