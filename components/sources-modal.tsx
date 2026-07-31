"use client"

import type { NewsItem } from "@/lib/news"
import { ExternalLink } from "lucide-react"
import { Modal } from "@/components/ui/modal"

type SourcesModalProps = {
  item: NewsItem
  onClose: () => void
}

/**
 * Lists every outlet that clustering matched to the same story.
 *
 * Focus trapping, Escape and backdrop handling come from <Modal>. This file
 * previously carried its own copy of that logic, which had drifted: it focused
 * the close button instead of the dialog, so a screen reader announced
 * "Fechar" before the dialog's own title.
 */
export function SourcesModal({ item, onClose }: SourcesModalProps) {
  const allSources = Array.from(new Set([item.source, ...(item.relatedSources ?? [])]))

  return (
    <Modal
      title="Cobertura de várias fontes"
      description={`${allSources.length} veículos publicaram sobre este mesmo fato.`}
      onClose={onClose}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          Fechar
        </button>
      }
    >
      <span className="inline-block rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-foreground">
        {item.category}
      </span>
      <h3 className="mt-2 font-serif text-base font-bold leading-snug text-foreground">
        {item.title}
      </h3>

      <ol className="mt-4 flex flex-col gap-2">
        {allSources.map((sourceName, index) => {
          const isLead = sourceName === item.source
          return (
            <li
              key={sourceName}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${
                isLead
                  ? "border-primary/40 bg-info-surface font-semibold text-foreground"
                  : "border-border bg-muted/40 text-foreground"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold text-foreground"
                >
                  {index + 1}
                </span>
                <span className="truncate">{sourceName}</span>
                {/* The lead source is marked with a word, not only the tinted
                    background, so the distinction survives without colour. */}
                {isLead ? (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[9px] font-extrabold uppercase text-primary-foreground">
                    Fonte principal
                  </span>
                ) : null}
              </div>
              {isLead ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <span>Abrir em {sourceName}</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Encontrado no feed</span>
              )}
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        O agrupamento é automático, por semelhança entre as manchetes. Ele pode juntar matérias
        próximas mas distintas, ou deixar de agrupar coberturas do mesmo fato com títulos muito
        diferentes.
      </p>
    </Modal>
  )
}
