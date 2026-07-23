"use client"

import { useCallback, useState } from "react"
import { writeStore } from "@/lib/storage"

export type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

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
