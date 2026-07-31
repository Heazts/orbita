"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isTypingTarget } from "@/lib/shortcuts"

type Options = {
  /** Mirrors the "Atalhos de teclado" preference; false unbinds everything. */
  enabled: boolean
  onOpenHelp: () => void
  onFocusSearch: () => void
}

/**
 * Binds the global shortcuts declared in lib/shortcuts.ts.
 *
 * Deliberately does *not* bind Escape: closing is owned by whichever component
 * is currently open (modal, menu, dialog), which knows what "close" means in
 * its own context. A single global Escape handler here would either fight those
 * or close the wrong thing.
 */
export function useShortcuts({ enabled, onOpenHelp, onFocusSearch }: Options): void {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      // Never hijack a combination the browser or OS owns.
      if (event.ctrlKey || event.metaKey) return
      // A shortcut fired from a repeat is almost always an accident.
      if (event.repeat) return

      if (event.altKey) {
        const destination = ALT_ROUTES[event.key]
        if (!destination) return
        event.preventDefault()
        router.push(destination)
        return
      }

      // Bare keys must not fire while the user is typing, or "/" and "?" could
      // never be entered into the search box at all.
      if (isTypingTarget(event.target)) return

      if (event.key === "/") {
        event.preventDefault()
        onFocusSearch()
        return
      }

      // "?" is Shift+/ on most layouts; match the produced character rather
      // than the physical key so it works on layouts where it is not.
      if (event.key === "?") {
        event.preventDefault()
        onOpenHelp()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled, onOpenHelp, onFocusSearch, router])
}

// Keep in step with the Alt entries in lib/shortcuts.ts.
const ALT_ROUTES: Record<string, string> = {
  "1": "/",
  "2": "/estudantes",
  "3": "/jogos",
}
