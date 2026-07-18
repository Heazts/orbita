"use client"

import { useCallback, useEffect, useState } from "react"
import { writeStore } from "@/lib/storage"

export type Theme = "light" | "dark"

// Reads from the <html> class, not localStorage: the inline script in
// app/layout.tsx already applies the persisted preference synchronously
// before hydration, so this just mirrors the DOM state React sees.
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>("light")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
  }, [])
  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark"
      document.documentElement.classList.remove("light", "dark")
      document.documentElement.classList.add(next)
      writeStore("orbita-theme", next)
      return next
    })
  }, [])
  return { theme, toggleTheme }
}
