"use client"

import { RefreshCw, Search, ServerCrash } from "lucide-react"

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed bg-muted/50 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Search className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-2xl font-bold">Nenhuma notícia encontrada</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Tente usar menos palavras, outro período ou limpar os filtros para ver mais resultados.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Limpar tudo
      </button>
    </div>
  )
}

/**
 * Shown when there is nothing to display because the sources failed, not
 * because the reader filtered everything out.
 *
 * This replaces four invented articles — headlines nobody wrote, attributed to
 * BBC Brasil, Agência Brasil, Olhar Digital and NASA, stamped with the current
 * time — that used to fill the page whenever every feed failed. Saying "we
 * could not load the news" is worth more than a page that looks like it worked.
 */
export function SourcesDownState({
  failedSources = [],
  onRetry,
}: {
  failedSources?: string[]
  onRetry: () => void
}) {
  return (
    <div
      role="alert"
      className="flex min-h-80 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-warning/40 bg-warning-surface/40 p-8 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-warning-surface">
        <ServerCrash className="size-7 text-warning" aria-hidden="true" />
      </div>
      <h2 className="font-serif text-2xl font-bold">Não conseguimos carregar as notícias</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        As fontes não responderam agora há pouco. Nada aqui está desatualizado — simplesmente não
        temos o que mostrar neste momento.
      </p>
      {failedSources.length > 0 && (
        <p className="max-w-md text-xs text-muted-foreground">
          Sem resposta: {failedSources.join(", ")}.
        </p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RefreshCw className="size-4" aria-hidden="true" />
        Tentar novamente
      </button>
    </div>
  )
}
