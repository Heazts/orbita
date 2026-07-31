"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useShortcuts } from "@/hooks/use-shortcuts"
import { usePreferences } from "@/hooks/use-preferences"
import { ShortcutsModal } from "@/components/shortcuts-modal"

// The search field is identified by its type, which is set in components/header.tsx.
const SEARCH_SELECTOR = 'input[type="search"]'

// How long to keep looking for the search field after navigating to the home
// page. The field arrives with the client render, so it is not in the DOM the
// instant the route changes.
const FOCUS_RETRY_MS = 1_500
const FOCUS_RETRY_INTERVAL_MS = 50

/**
 * Binds the global shortcuts once for the whole app and owns the help dialog.
 *
 * Mounted in the root layout rather than per-page so Alt+1/2/3 work from
 * anywhere, including the error and not-found pages where the dashboard's own
 * chrome is absent.
 */
export function ShortcutsProvider() {
  const [helpOpen, setHelpOpen] = useState(false)
  const { prefs, setPreference } = usePreferences()
  const router = useRouter()
  const pathname = usePathname()

  const openHelp = useCallback(() => setHelpOpen(true), [])

  const focusSearchInput = useCallback((): boolean => {
    const input = document.querySelector<HTMLInputElement>(SEARCH_SELECTOR)
    if (!input) return false
    input.focus()
    input.select()
    return true
  }, [])

  // Set when "/" was pressed on a page that has no search field, so focus can
  // be applied once the home page has actually rendered one.
  const awaitingSearchRef = useRef(false)

  const focusSearch = useCallback(() => {
    if (focusSearchInput()) return
    // Pages like /jogos and /termos have no search field. Send the reader to
    // the home page, then focus the field there — previously this navigated to
    // "/?focus=search", a parameter nothing ever read, so the shortcut left the
    // reader on the home page with focus still at the top of the document.
    awaitingSearchRef.current = true
    router.push("/")
  }, [focusSearchInput, router])

  useEffect(() => {
    if (!awaitingSearchRef.current) return

    const startedAt = Date.now()
    const timer = setInterval(() => {
      if (focusSearchInput() || Date.now() - startedAt > FOCUS_RETRY_MS) {
        awaitingSearchRef.current = false
        clearInterval(timer)
      }
    }, FOCUS_RETRY_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [pathname, focusSearchInput])

  useShortcuts({
    enabled: prefs.shortcuts,
    onOpenHelp: openHelp,
    onFocusSearch: focusSearch,
  })

  if (!helpOpen) return null

  return (
    <ShortcutsModal
      enabled={prefs.shortcuts}
      onToggle={(enabled) => setPreference("shortcuts", enabled)}
      onClose={() => setHelpOpen(false)}
    />
  )
}
