"use client"

import { useCallback, useEffect, useState } from "react"
import { writeStore } from "@/lib/storage"

export type Theme = "light" | "dark"
// What the user chose: an explicit theme, or "system" to follow the OS/browser
// preference (including live changes while the page is open).
export type ThemeMode = Theme | "system"

const STORAGE_KEY = "orbita-theme"

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
}

function resolve(mode: ThemeMode): Theme {
  if (mode === "system") return systemPrefersDark() ? "dark" : "light"
  return mode
}

// Background colors mirrored from the themeColor entries in app/layout.tsx.
const THEME_COLOR: Record<Theme, string> = {
  light: "#FFFFFF",
  dark: "#111111",
}

function applyClass(theme: Theme): void {
  const root = document.documentElement
  // Suppress CSS transitions while the theme flips: many surfaces have
  // `transition-colors` (~150ms) while others change instantly, so without
  // this the page shows mixed old/new colors for a moment (see globals.css
  // `.theme-switching`). Removed shortly after, past the longest transition.
  root.classList.add("theme-switching")
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  // Keep the browser UI (mobile address bar / status bar) on the chosen theme.
  // The server renders media-scoped theme-color metas that follow the OS; once
  // the user picks a theme, both metas get the resolved color so whichever the
  // browser matches agrees with the page.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", THEME_COLOR[theme])
  }
  // Cancel any pending removal first. Toggling twice inside 200ms used to leave
  // two timers running, and the first would strip `theme-switching` while the
  // second flip was still mid-transition — reintroducing exactly the mixed
  // old/new colour flash this class exists to prevent.
  window.clearTimeout(themeSwitchTimeout)
  themeSwitchTimeout = window.setTimeout(() => root.classList.remove("theme-switching"), 200)
}

// Module scope because applyTheme is a plain function shared by every caller,
// not a hook with its own instance state.
let themeSwitchTimeout: number | undefined

// The boot script in app/layout.tsx applies the right class before hydration;
// reading it back keeps the first client render consistent with the DOM.
function getInitialTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

function getInitialMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "light" || stored === "dark" || stored === "system") return stored
  } catch {
    // Private mode — fall through to "system".
  }
  return "system"
}

export function useTheme(): {
  theme: Theme
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
} {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    const resolved = resolve(next)
    applyClass(resolved)
    setTheme(resolved)
    writeStore(STORAGE_KEY, next)
  }, [])

  // In system mode, follow OS/browser theme changes live.
  useEffect(() => {
    if (mode !== "system") return
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      const resolved: Theme = query.matches ? "dark" : "light"
      applyClass(resolved)
      setTheme(resolved)
    }
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [mode])

  // The header button stays a quick one-tap switch: it always sets an explicit
  // theme (overriding "system"), which is what a tap on a sun/moon icon means.
  const toggleTheme = useCallback(() => {
    setMode(theme === "dark" ? "light" : "dark")
  }, [theme, setMode])

  return { theme, mode, setMode, toggleTheme }
}
