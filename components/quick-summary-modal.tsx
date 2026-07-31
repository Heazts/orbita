"use client"

import { Clock, ExternalLink, FileText } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { StatusMessage } from "@/components/ui/status-message"
import { buildQuickSummary } from "@/lib/summary"
import type { NewsItem } from "@/lib/news"

type QuickSummaryModalProps = {
  item: NewsItem
  onClose: () => void
}

/**
 * Shows the headline and the opening sentences of a feed item.
 *
 * Focus management, the Escape binding and the backdrop behaviour all come
 * from <Modal>; this component only supplies content.
 */
export function QuickSummaryModal({ item, onClose }: QuickSummaryModalProps) {
  const summary = buildQuickSummary(item)

  return (
    <Modal
      title="Resumo rápido"
      description="Trechos extraídos do texto publicado pela fonte, sem reescrita."
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            Fechar
          </button>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span>Ler em {item.source}</span>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* The tone estimate carries an icon and the word "estimado" so it is
            never read as a verified classification. */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-bold text-foreground">
          <FileText className="size-3.5" aria-hidden="true" />
          Tom estimado: {summary.tone}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          {summary.readTimeMinutes} min de leitura · {summary.wordCount} palavras
        </span>
      </div>

      <dl className="mt-4 flex flex-col gap-3">
        {summary.excerpts.map((excerpt) => (
          <div key={excerpt.label} className="rounded-xl bg-muted/50 p-3.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {excerpt.label}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{excerpt.text}</dd>
          </div>
        ))}
      </dl>

      {summary.isHeadlineOnly ? (
        <StatusMessage
          variant="info"
          title="Esta fonte não publicou um resumo"
          className="mt-4"
          live="off"
        >
          O feed trouxe apenas a manchete. Abra a matéria na fonte para ler o texto completo.
        </StatusMessage>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Como isto é gerado: o texto acima é recortado da própria descrição publicada no feed
        RSS, sem reescrita, sem geração de texto e sem envio de dados para nenhum serviço
        externo. O tom é uma estimativa por palavras-chave e pode errar.
      </p>
    </Modal>
  )
}
