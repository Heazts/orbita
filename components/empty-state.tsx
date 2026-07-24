"use client"

import { Search } from "lucide-react"

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
