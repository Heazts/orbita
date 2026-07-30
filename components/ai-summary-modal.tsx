"use client"

import { useEffect, useRef } from "react"
import { generateLocalSummary } from "@/lib/ai"
import type { NewsItem } from "@/lib/news"
import { Bot, Clock, ExternalLink, ShieldCheck, X } from "lucide-react"

type AiSummaryModalProps = {
  item: NewsItem
  onClose: () => void
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function AiSummaryModal({ item, onClose }: AiSummaryModalProps) {
  const summary = generateLocalSummary(item)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // WAI-ARIA dialog (modal) pattern: move focus in on open, trap Tab inside
  // while open, close on Escape, and restore focus to whatever opened the
  // modal (the card's "Resumo & IA" button) once it unmounts. Previously the
  // only way out was clicking the backdrop — Tab could escape into the page
  // behind the overlay and there was no keyboard-only way to close.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-ai-title"
      >
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Bot className="size-4" aria-hidden="true" />
            <span>Resumo & Análise de IA Local</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar resumo"
            className="rounded-full p-1 transition-colors hover:bg-muted"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4">
          <h2 id="modal-ai-title" className="font-serif text-lg font-bold leading-snug">
            {item.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-bold text-primary">
              {summary.tone}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3" aria-hidden="true" />
              {summary.readTimeMinutes} min de leitura ({summary.wordCount} palavras)
            </span>
          </div>
        </div>

        {/* Bullet Points */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl bg-muted/40 p-4 text-sm leading-relaxed">
          {summary.bullets.map((bullet, idx) => (
            <p key={idx} className="font-medium text-foreground/90">
              {bullet}
            </p>
          ))}
        </div>

        {/* Privacy Note */}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-xs text-primary">
          <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
          <span>{summary.privacyNote}</span>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span>Ler matéria na íntegra ({item.source})</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-4 py-2 text-xs font-bold transition-colors hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
