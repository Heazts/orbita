"use client"

import { useEffect, useRef } from "react"
import type { NewsItem } from "@/lib/news"
import { ExternalLink, Layers, ShieldCheck, Users, X } from "lucide-react"

type SourcesModalProps = {
  item: NewsItem
  onClose: () => void
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function SourcesModal({ item, onClose }: SourcesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const allSources = Array.from(new Set([item.source, ...(item.relatedSources ?? [])]))

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-sources-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Users className="size-4" aria-hidden="true" />
            <span>Cobertura Multi-Fonte ({allSources.length} veículos)</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de fontes"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Story Title */}
        <div className="mt-4">
          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            {item.category}
          </span>
          <h2 id="modal-sources-title" className="mt-2 font-serif text-lg font-bold leading-snug">
            {item.title}
          </h2>
        </div>

        {/* Multi-source outlets list */}
        <div className="mt-5 flex flex-col gap-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Veículos que reportaram este mesmo evento:
          </p>
          <div className="flex flex-col gap-2">
            {allSources.map((sourceName, idx) => {
              const isLead = sourceName === item.source
              return (
                <div
                  key={sourceName}
                  className={`flex items-center justify-between rounded-xl border p-3 text-sm transition-all ${
                    isLead
                      ? "border-primary/40 bg-primary/5 font-semibold text-foreground"
                      : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-background text-[11px] font-bold text-foreground shadow-sm">
                      {idx + 1}
                    </span>
                    <span>{sourceName}</span>
                    {isLead && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase text-primary-foreground">
                        Fonte Principal
                      </span>
                    )}
                  </div>
                  {isLead ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      <span>Abrir</span>
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Confirmado no feed</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Fact Checking / Neutrality note */}
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          <span>
            O Órbita agrupa automaticamente matérias sobre o mesmo fato para você comparar diferentes ângulos editoriais com transparência.
          </span>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2 text-xs font-bold transition-colors hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
