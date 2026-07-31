"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/ui/error-state"

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Name and digest only. The full error object can carry a message built
    // from internal state — a failing upstream URL, a parse error quoting the
    // offending input — and this runs in the browser, where anything logged is
    // visible to whoever opens the console.
    console.error("Erro não tratado:", error.name, error.digest ?? "")
  }, [error])

  // Deliberately no customMessage. `error.message` used to be rendered straight
  // into the page. Next replaces server-side messages with a generic string in
  // production, but errors thrown in client components keep their real text —
  // so this was a live path for internal detail to reach the reader, and an
  // exception message is not useful copy for them either way.
  return <ErrorState code="500" onRetry={reset} />
}
