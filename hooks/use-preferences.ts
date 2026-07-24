"use client"

import { useCallback, useEffect } from "react"
import { useHydratedState } from "@/hooks/use-hydrated-state"

export type NewsTone = "balanced" | "all"

export type Preferences = {
  // "balanced" hides heavy/pessimistic items while browsing (never while
  // searching); "all" shows everything the feed returns.
  tone: NewsTone
  // Whether to surface the passive "novas matérias" pill and the header badge.
  newAlerts: boolean
  // Kill all non-essential animation (ticker, card cascade, fades).
  reduceMotion: boolean
}

export const DEFAULT_PREFERENCES: Preferences = {
  tone: "balanced",
  newAlerts: true,
  reduceMotion: false,
}

const STORAGE_KEY = "orbita-prefs"

export function usePreferences(): {
  prefs: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
} {
  const [stored, setStored] = useHydratedState<Preferences>(STORAGE_KEY, DEFAULT_PREFERENCES)
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
