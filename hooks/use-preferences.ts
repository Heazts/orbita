"use client"

import { useCallback, useEffect } from "react"
import { useHydratedState } from "@/hooks/use-hydrated-state"
import { isPlainObject } from "@/lib/guards"

export type NewsTone = "balanced" | "all"

export type Preferences = {
  // "balanced" hides heavy/pessimistic items while browsing (never while
  // searching); "all" shows everything the feed returns.
  tone: NewsTone
  // Whether to surface the passive "novas matérias" pill and the header badge.
  newAlerts: boolean
  // Kill all non-essential animation (ticker, card cascade, fades).
  reduceMotion: boolean
  // Global keyboard shortcuts ("/", "?", Alt+number). On by default, but some
  // assistive tech and alternative input devices synthesise keystrokes that
  // collide with single-key shortcuts, so this has to be switchable off.
  shortcuts: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  tone: "balanced",
  newAlerts: true,
  reduceMotion: false,
  shortcuts: true,
}

const STORAGE_KEY = "orbita-prefs"

// Deliberately tolerant of *missing* keys — an object saved by an older version
// is merged over the defaults below and stays valid. What it rejects is a key
// present with the wrong type, which the merge would otherwise pass through
// (a string `reduceMotion` is truthy, so "false" would enable it).
function isStoredPreferences(value: unknown): value is Preferences {
  if (!isPlainObject(value)) return false
  const { tone, newAlerts, reduceMotion, shortcuts } = value
  return (
    (tone === undefined || tone === "balanced" || tone === "all") &&
    (newAlerts === undefined || typeof newAlerts === "boolean") &&
    (reduceMotion === undefined || typeof reduceMotion === "boolean") &&
    (shortcuts === undefined || typeof shortcuts === "boolean")
  )
}

export function usePreferences(): {
  prefs: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
} {
  const [stored, setStored] = useHydratedState<Preferences>(
    STORAGE_KEY,
    DEFAULT_PREFERENCES,
    isStoredPreferences,
  )
  // Merge over defaults so a partial object saved by an older version (missing
  // a key added later) still yields a complete, well-typed Preferences.
  const prefs: Preferences = { ...DEFAULT_PREFERENCES, ...stored }

  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setStored((prev) => ({ ...DEFAULT_PREFERENCES, ...prev, [key]: value }))
    },
    [setStored],
  )

  // Reflect the motion preference on <html> so a single CSS rule can neutralize
  // every animation/transition (see .reduce-motion in globals.css).
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", prefs.reduceMotion)
  }, [prefs.reduceMotion])

  return { prefs, setPreference }
}
