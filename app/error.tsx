"use client"

import { useEffect } from "react"
import { ErrorState } from "@/components/ui/error-state"

type ErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log exception for telemetry if needed
    console.error("Global Error Boundary caught exception:", error)
  }, [error])

  return (
    <ErrorState
      code="500"
      onRetry={reset}
      customMessage={error.message || "Ocorreu um erro inesperado ao carregar esta página."}
    />
  )
}
