"use client"

import { useEffect, useState } from "react"

// null until mounted (avoids an SSR/client timestamp mismatch), then ticks
// on an interval so relative timestamps ("há 5 min") stay current.
export function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(interval)
  }, [intervalMs])
  return now
}
