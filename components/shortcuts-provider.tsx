"use client"

import { useCallback, useState } from "react"
import { useShortcuts } from "@/hooks/use-shortcuts"
import { usePreferences } from "@/hooks/use-preferences"
import { ShortcutsModal } from "@/components/shortcuts-modal"

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

  const openHelp = useCallback(() => setHelpOpen(true), [])

  // The search field lives inside the dashboard and is not always mounted (the
  // games and legal pages have no search). Rather than reach across the tree
  // with a ref, "/" focuses whatever the page has published as its search
  // input; when there is none, it falls back to the home page where there is.
  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="search"], [data-search-input]')
    if (input) {
      input.focus()
      input.select()
      return
    }
    window.location.assign("/?focus=search")
  }, [])

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
