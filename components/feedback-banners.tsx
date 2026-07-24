"use client"

import { Check, RefreshCw } from "lucide-react"

// Transient confirmation ("Link copiado").
export function NoticeBanner({ notice }: { notice: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 rounded-lg border bg-muted p-3 text-sm"
    >
      <Check className="size-4" aria-hidden="true" />
      {notice}
    </div>
  )
}

// Shown when the news request fails. `message` comes from the fetcher, which
// distinguishes rate limiting from a generic outage.
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/10">
        <RefreshCw className="size-4 text-destructive" aria-hidden="true" />
      </div>
      <div>
        <p className="font-medium">{message}</p>
        <p className="text-xs text-muted-foreground">Tente novamente em alguns instantes.</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="ml-auto shrink-0 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/10"
      >
        Tentar novamente
      </button>
    </div>
  )
}

// Discreet note listing feeds that failed for this response; the rest of the
// panel keeps working.
export function FailedSourcesBanner({ sources }: { sources: string[] }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground"
    >
      <span className="inline-block size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      Algumas fontes estão indisponíveis no momento: {sources.join(", ")}.
    </div>
  )
}

// Passive announcement: the new items are already in the list (SWR refreshes on
// an interval), so there is nothing to click — they cascade in on their own.
export function NewItemsPill({ count }: { count: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive"
    >
      <span className="live-dot size-2 rounded-full bg-destructive" aria-hidden="true" />
      {count} {count === 1 ? "nova matéria" : "novas matérias"}
    </div>
  )
}
