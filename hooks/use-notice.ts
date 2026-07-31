"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** How long a notice stays on screen before dismissing itself. */
const DISMISS_AFTER_MS = 2_500

/**
 * A transient one-line message ("Link copiado"), shown briefly and then cleared.
 *
 * Extracted from the dashboard, where it was three loose pieces — a state, a
 * ref and an effect — sitting between unrelated concerns. The timer handling is
 * the whole reason it deserves to be a unit: showing a second notice while the
 * first is still up has to cancel the pending dismissal, or the earlier timer
 * fires and clears the newer message before its time.
 */
export function useNotice(): {
  notice: string
  showNotice: (message: string) => void
} {
  const [notice, setNotice] = useState("")
  const timeout = useRef<number | undefined>(undefined)

  const showNotice = useCallback((message: string) => {
    window.clearTimeout(timeout.current)
    setNotice(message)
    timeout.current = window.setTimeout(() => setNotice(""), DISMISS_AFTER_MS)
  }, [])

  // Cancels a pending dismissal on unmount, so a notice shown just before
  // navigating away cannot set state on an unmounted component.
  useEffect(() => () => window.clearTimeout(timeout.current), [])

  return { notice, showNotice }
}
