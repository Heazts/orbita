"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Clock,
  Compass,
  Gamepad2,
  Lock,
  Newspaper,
  RefreshCw,
  ServerCrash,
  Wrench,
  WifiOff,
} from "lucide-react"

export type ErrorCode =
  | "400"
  | "403"
  | "404"
  | "429"
  | "500"
  | "502"
  | "503"
  | "504"
  | "OFFLINE"
  | "MANUTENCAO"

type Severity = "warning" | "danger" | "info"

type ErrorDetails = {
  /** Shown as a small eyebrow above the heading. Plain language, not a status line. */
  label: string
  title: string
  /** What happened and what it means for the reader — never a stack-trace gloss. */
  description: string
  /** What the reader can do about it, if anything. */
  suggestion: string
  icon: typeof ServerCrash
  severity: Severity
}

/**
 * Copy rules for this table, learned from the version it replaces:
 *
 * - No implementation detail. The previous copy shipped lines like "HTTP 400
 *   Bad Request: Parâmetros da query string falharam na validação sanitizada"
 *   to readers of a news site. It named internals (Edge Proxy, Server
 *   Component, the 8000ms feed timeout) without giving anyone a next step.
 * - Say who is at fault. "Os servidores da fonte não responderam" is useful;
 *   "ocorreu um erro" is not.
 * - Every entry ends with something the reader can actually do.
 */
const ERROR_CONFIG: Record<ErrorCode, ErrorDetails> = {
  "400": {
    label: "Busca inválida",
    title: "Não conseguimos entender essa busca",
    description: "Os termos ou filtros enviados têm um formato que a busca não aceita.",
    suggestion: "Tente reescrever a busca com palavras simples, sem símbolos.",
    icon: AlertTriangle,
    severity: "warning",
  },
  "403": {
    label: "Acesso negado",
    title: "Esta página não está disponível para você",
    description: "O acesso a este endereço foi recusado.",
    suggestion: "Volte para a página inicial e continue a partir dali.",
    icon: Lock,
    severity: "danger",
  },
  "404": {
    label: "Página não encontrada",
    title: "Esta página saiu de órbita",
    description:
      "O endereço não existe, mudou de lugar, ou a matéria foi retirada do ar pela fonte original.",
    suggestion: "Confira o endereço, ou use a busca para encontrar o assunto.",
    icon: Compass,
    severity: "info",
  },
  "429": {
    label: "Muitas requisições",
    title: "Você fez muitas buscas em pouco tempo",
    description:
      "Existe um limite de requisições por minuto para não sobrecarregar os sites das fontes.",
    suggestion: "Aguarde um instante antes de buscar de novo.",
    icon: Clock,
    severity: "warning",
  },
  "500": {
    label: "Erro no servidor",
    title: "Algo deu errado do nosso lado",
    description: "O servidor encontrou um erro ao montar esta página. A falha não foi sua.",
    suggestion: "Tente novamente. Se continuar, o problema é nosso e já estamos vendo.",
    icon: ServerCrash,
    severity: "danger",
  },
  "502": {
    label: "Resposta inválida da fonte",
    title: "Uma das fontes respondeu de forma inesperada",
    description: "Um ou mais veículos enviaram dados que não conseguimos interpretar.",
    suggestion: "Costuma se resolver sozinho em alguns minutos. Tente novamente.",
    icon: ServerCrash,
    severity: "warning",
  },
  "503": {
    label: "Serviço indisponível",
    title: "As fontes de notícia estão fora do ar",
    description: "Não conseguimos alcançar os feeds no momento.",
    suggestion: "Tente novamente em alguns minutos.",
    icon: ServerCrash,
    severity: "warning",
  },
  "504": {
    label: "Tempo esgotado",
    title: "As fontes demoraram demais para responder",
    description: "A busca foi interrompida porque os sites das fontes não responderam a tempo.",
    suggestion: "Tente novamente — normalmente funciona na segunda tentativa.",
    icon: Clock,
    severity: "warning",
  },
  OFFLINE: {
    label: "Sem conexão",
    title: "Você está sem internet",
    description: "Não foi possível alcançar a rede a partir deste dispositivo.",
    suggestion: "Verifique o Wi-Fi ou os dados móveis e tente novamente.",
    icon: WifiOff,
    severity: "info",
  },
  MANUTENCAO: {
    label: "Em manutenção",
    title: "Estamos em manutenção",
    description: "Esta parte do site está temporariamente fora do ar para atualização.",
    suggestion: "Volte em alguns minutos. As notícias continuam disponíveis na página inicial.",
    icon: Wrench,
    severity: "info",
  },
}

const SEVERITY_STYLES: Record<Severity, { icon: string; chip: string }> = {
  warning: { icon: "text-warning", chip: "border-warning/30 bg-warning-surface text-warning" },
  danger: { icon: "text-danger", chip: "border-danger/30 bg-danger-surface text-danger" },
  info: { icon: "text-info", chip: "border-info/30 bg-info-surface text-info" },
}

type ErrorStateProps = {
  code: ErrorCode
  onRetry?: () => void
  customMessage?: string
  /**
   * Seconds until a retry is worth attempting. Drives a countdown that disables
   * the retry button; it does not retry on its own.
   */
  retryAfterSeconds?: number
}

export function ErrorState({ code, onRetry, customMessage, retryAfterSeconds }: ErrorStateProps) {
  const config = ERROR_CONFIG[code] ?? ERROR_CONFIG["500"]
  const Icon = config.icon
  const styles = SEVERITY_STYLES[config.severity]

  // Only counts down when the caller supplied a real Retry-After. The previous
  // version invented a 30 second wait for every 429 and told the reader it
  // would "tentar novamente automaticamente", which nothing ever did — the
  // button simply sat disabled until the timer ran out.
  const [countdown, setCountdown] = useState<number | null>(retryAfterSeconds ?? null)

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((previous) => (previous && previous > 1 ? previous - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const waiting = countdown !== null && countdown > 0

  return (
    <main
      id="conteudo-principal"
      className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-5 py-12 text-center"
    >
      {/* role="alert" so a screen reader announces the failure on arrival
          instead of leaving it to be discovered by browsing. */}
      <div role="alert" className="flex flex-col items-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
          <Icon className={`size-8 ${styles.icon}`} aria-hidden="true" />
        </div>

        {/* The severity is written out, not just coloured. */}
        <span
          className={`mt-5 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles.chip}`}
        >
          {config.label}
        </span>

        <h1 className="mt-3 text-balance font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {config.title}
        </h1>

        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          {customMessage || config.description}
        </p>

        <p className="mt-2 text-pretty text-sm leading-relaxed text-foreground/80">
          {config.suggestion}
        </p>

        {waiting ? (
          <p
            // aria-live so the remaining time is announced as it changes,
            // rather than only on first render.
            aria-live="polite"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-surface px-4 py-2 text-sm font-bold text-warning"
          >
            <Clock className="size-4" aria-hidden="true" />
            Tente novamente em {countdown}s
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            disabled={waiting}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Tentar novamente
          </button>
        ) : null}

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted"
        >
          <Newspaper className="size-4" aria-hidden="true" />
          Ir para as notícias
        </Link>

        <Link
          href="/jogos"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Gamepad2 className="size-4" aria-hidden="true" />
          Jogos
        </Link>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Se o problema persistir,{" "}
        <a
          href="https://github.com/Heazts/orbita/issues/new/choose"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-primary hover:underline"
        >
          avise a gente
        </a>
        .
      </p>
    </main>
  )
}
