"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Gamepad2,
  Lock,
  Newspaper,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  WifiOff,
} from "lucide-react"

export type ErrorCode = "400" | "403" | "404" | "429" | "500" | "502" | "503" | "504" | "OFFLINE"

type ErrorDetails = {
  code: string
  badge: string
  title: string
  description: string
  technical: string
  icon: typeof ServerCrash
  colorClass: string
  badgeBg: string
}

const ERROR_CONFIG: Record<ErrorCode, ErrorDetails> = {
  "400": {
    code: "400",
    badge: "Erro 400 · Requisição Inválida",
    title: "Parâmetros de busca incompreensíveis",
    description: "A pesquisa ou os filtros enviados continham caracteres malformatados ou um formato não suportado pelo indexador.",
    technical: "HTTP 400 Bad Request: Parâmetros da query string falharam na validação sanitizada.",
    icon: AlertTriangle,
    colorClass: "text-amber-500",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  "403": {
    code: "403",
    badge: "Erro 403 · Acesso Negado",
    title: "Acesso bloqueado por política de segurança",
    description: "A requisição foi recusada pelos controles de segurança de origem ou cabeçalhos de proteção do servidor.",
    technical: "HTTP 403 Forbidden: Origem não autorizada ou bloqueio por filtro de segurança (CSP/Edge Proxy).",
    icon: Lock,
    colorClass: "text-rose-500",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  "404": {
    code: "404",
    badge: "Erro 404 · Não Encontrado",
    title: "Esta página saiu de órbita",
    description: "O endereço acessado não existe, foi alterado ou a matéria foi removida da origem original.",
    technical: "HTTP 404 Not Found: Rota ou recurso não mapeado no servidor.",
    icon: ShieldAlert,
    colorClass: "text-primary",
    badgeBg: "bg-primary/10 text-primary border-primary/20",
  },
  "429": {
    code: "429",
    badge: "Erro 429 · Limite de Requisições Excedido",
    title: "Muitas buscas em um curto intervalo",
    description: "Para proteger os servidores dos veículos e garantir estabilidade, o limite temporário de requisições foi atingido.",
    technical: "HTTP 429 Too Many Requests: Limite da janela móvel de rate-limiting (30 requisições/minuto) alcançado.",
    icon: Clock,
    colorClass: "text-orange-500",
    badgeBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  "500": {
    code: "500",
    badge: "Erro 500 · Falha Interna no Servidor",
    title: "Ocorreu um erro inesperado no sistema",
    description: "Nossos servidores encontraram uma exceção interna ao tentar processar a agregação de notícias.",
    technical: "HTTP 500 Internal Server Error: Exceção não tratada na execução do Server Component ou API Route.",
    icon: ServerCrash,
    colorClass: "text-destructive",
    badgeBg: "bg-destructive/10 text-destructive border-destructive/20",
  },
  "502": {
    code: "502",
    badge: "Erro 502 · Bad Gateway",
    title: "Resposta inválida das fontes externas",
    description: "Um ou mais portais de notícia terceiros retornaram dados malformados ou corrompidos.",
    technical: "HTTP 502 Bad Gateway: Resposta inválida recebida durante a busca do feed RSS remoto.",
    icon: ServerCrash,
    colorClass: "text-purple-500",
    badgeBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  "503": {
    code: "503",
    badge: "Erro 503 · Serviço Indisponível",
    title: "Serviço temporariamente indisponível",
    description: "Os servidores de notícia estão passando por manutenção ou instabilidade temporária na rede.",
    technical: "HTTP 503 Service Unavailable: Feeds RSS indisponíveis ou falha de conectividade upstream.",
    icon: ServerCrash,
    colorClass: "text-rose-500",
    badgeBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  "504": {
    code: "504",
    badge: "Erro 504 · Gateway Timeout",
    title: "Tempo de resposta do servidor esgotado",
    description: "Os portais de notícias demoraram mais de 8 segundos para responder e a requisição expirou por segurança.",
    technical: "HTTP 504 Gateway Timeout: Timeout de 8000ms atingido na busca remota dos feeds RSS.",
    icon: Clock,
    colorClass: "text-amber-600",
    badgeBg: "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-600/20",
  },
  OFFLINE: {
    code: "OFFLINE",
    badge: "Sem Conexão · Dispositivo Offline",
    title: "Você está sem conexão com a internet",
    description: "Não foi possível conectar-se à rede. Verifique seu Wi-Fi ou dados móveis para carregar notícias recentes.",
    technical: "NETWORK_OFFLINE: navigator.onLine = false. Impossível estabelecer conexão TCP/HTTP.",
    icon: WifiOff,
    colorClass: "text-blue-500",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
}

type ErrorStateProps = {
  code: ErrorCode
  onRetry?: () => void
  customMessage?: string
  retryAfterSeconds?: number
}

export function ErrorState({ code, onRetry, customMessage, retryAfterSeconds }: ErrorStateProps) {
  const config = ERROR_CONFIG[code] ?? ERROR_CONFIG["500"]
  const Icon = config.icon

  const [countdown, setCountdown] = useState<number | null>(retryAfterSeconds ?? (code === "429" ? 30 : null))

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev && prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center">
        {/* Animated Icon Circle */}
        <div className={`flex size-20 items-center justify-center rounded-3xl border bg-card shadow-lg transition-transform duration-300 hover:scale-105 ${config.colorClass}`}>
          <Icon className="size-10" aria-hidden="true" />
        </div>

        {/* Error Badge */}
        <span className={`mt-6 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black uppercase tracking-wider ${config.badgeBg}`}>
          {config.badge}
        </span>

        {/* Error Title */}
        <h1 className="mt-3 text-balance font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {config.title}
        </h1>

        {/* Error Description */}
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
          {customMessage || config.description}
        </p>

        {/* Retry countdown if 429 */}
        {countdown !== null && countdown > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <Clock className="size-4 animate-spin" aria-hidden="true" />
            <span>Aguarde {countdown}s para tentar novamente automaticamente...</span>
          </div>
        )}

        {/* Technical details accordion box */}
        <div className="mt-5 w-full rounded-xl border border-border/60 bg-muted/30 p-3.5 text-left text-[11px] font-mono text-muted-foreground">
          <span className="font-bold text-foreground">Código de Diagnóstico:</span>
          <p className="mt-1 break-all">{config.technical}</p>
        </div>

        {/* Actions */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={countdown !== null && countdown > 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow transition-all hover:opacity-90 disabled:opacity-50"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              <span>Tentar Novamente</span>
            </button>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Newspaper className="size-4" aria-hidden="true" />
            <span>Voltar para as Notícias</span>
          </Link>

          <Link
            href="/jogos"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Gamepad2 className="size-4" aria-hidden="true" />
            <span>Jogos</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
