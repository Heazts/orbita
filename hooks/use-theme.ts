"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
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

// The class on <html> is the source of truth for the painted theme: the boot
// script in app/layout.tsx sets it before React exists, and applyClass below is
// the only other writer. That makes it an external store, which is why the hook
// reads it through useSyncExternalStore rather than mirroring it into state.
//
// Subscribers are notified synchronously from applyClass. A MutationObserver
// would be the more general way to watch the attribute, but its callback is a
// microtask, so a theme flip would land a tick after the click that caused it.
const themeListeners = new Set<() => void>()

function subscribeToTheme(onStoreChange: () => void): () => void {
  themeListeners.add(onStoreChange)
  return () => themeListeners.delete(onStoreChange)
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
  for (const listener of themeListeners) listener()
}

// Module scope because applyTheme is a plain function shared by every caller,
// not a hook with its own instance state.
let themeSwitchTimeout: number | undefined

/** The theme the page is currently painted in, read from the DOM. */
function getThemeSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light"
}

/**
 * What the server, and the client's hydration render, see instead.
 *
 * null rather than a guess. The previous code read the <html> class during
 * render, so the server (no document) produced "light" while the client (boot
 * script already run) produced "dark", and React rejected the mismatched tree
 * with error #418 for every reader on a dark device — reproduced in a browser
 * against a production build. React uses this snapshot for the hydration render
 * and switches to the live one immediately after, which is exactly the sequence
 * that makes the two agree.
 */
function getServerThemeSnapshot(): null {
  return null
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
  /**
   * null until hydration, then the theme the page is actually painted in.
   *
   * The server cannot know this — it depends on localStorage and the device's
   * colour-scheme preference — so it must not guess. The server render and the
   * client's hydration render both see null and agree; React then switches to
   * the live snapshot. Consumers render something theme-neutral for null. Same
   * shape as useNow(), which returns null pre-hydration for the same reason.
   */
  theme: Theme | null
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
} {
  // Derived from the DOM, not mirrored into state: applyClass is the only
  // writer, and it notifies subscribers synchronously, so there is no second
  // copy of the theme that can drift from the class actually on <html>.
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot)
  // Mode is not part of the server-rendered markup — the preferences panel is
  // closed on first paint and lazily loaded — so reading it during render is
  // safe and cannot mismatch.
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode)

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    // applyClass writes the class and notifies, which is what updates `theme`.
    applyClass(resolve(next))
    writeStore(STORAGE_KEY, next)
  }, [])

  // In system mode, follow OS/browser theme changes live.
  useEffect(() => {
    if (mode !== "system") return
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => applyClass(query.matches ? "dark" : "light")
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [mode])

  // The header button stays a quick one-tap switch: it always sets an explicit
  // theme (overriding "system"), which is what a tap on a sun/moon icon means.
  //
  // Falls back to reading the DOM when theme is still null. A tap can only
  // happen after hydration in practice, but resolving it here means the toggle
  // can never flip to the theme the reader is already looking at.
  const toggleTheme = useCallback(() => {
    setMode((theme ?? getThemeSnapshot()) === "dark" ? "light" : "dark")
  }, [theme, setMode])

  return { theme, mode, setMode, toggleTheme }
}
