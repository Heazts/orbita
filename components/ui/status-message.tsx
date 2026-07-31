import type { ReactNode } from "react"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"

export type StatusVariant = "success" | "warning" | "danger" | "info"

type StatusMessageProps = {
  variant: StatusVariant
  /** Short summary. Rendered as the accessible name of the message. */
  title: string
  children?: ReactNode
  /** Recovery actions — a retry button, a link home. */
  actions?: ReactNode
  /**
   * How assistive tech should announce this.
   * - "polite" (default): queued behind whatever is being read.
   * - "assertive": interrupts. Reserve it for something the reader must act on
   *   right now, such as a submission that failed.
   * - "off": not announced, for status that is purely decorative context.
   */
  live?: "polite" | "assertive" | "off"
  className?: string
}

/**
 * The single place a status colour is allowed to appear.
 *
 * Every variant carries three independent signals — colour, a distinct icon
 * shape, and a written label — so none of the meaning is lost by a reader with
 * any form of colour vision deficiency, by a screen reader user, or in forced
 * colours mode where the palette is replaced outright. The icons are chosen to
 * differ in silhouette as well as hue: a tick, a triangle, a cross and a
 * circled "i" stay apart at a glance even in monochrome.
 */
export function StatusMessage({
  variant,
  title,
  children,
  actions,
  live = "polite",
  className = "",
}: StatusMessageProps) {
  const { Icon, surface, text, label } = STATUS_STYLES[variant]

  return (
    <div
      // role="alert" already implies aria-live="assertive"; using role="status"
      // for everything else keeps announcements from stomping on each other.
      role={live === "assertive" ? "alert" : "status"}
      aria-live={live === "off" ? undefined : live}
      className={`flex flex-col gap-3 rounded-xl border p-4 ${surface} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${text}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${text}`}>
            {/* The variant is named in text, not implied by the colour. Visually
                hidden because the icon already carries it for sighted readers. */}
            <span className="sr-only">{label}: </span>
            {title}
          </p>
          {children ? (
            <div className="mt-1 text-sm leading-relaxed text-foreground/80">{children}</div>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 pl-8">{actions}</div> : null}
    </div>
  )
}

const STATUS_STYLES: Record<
  StatusVariant,
  { Icon: typeof Info; surface: string; text: string; label: string }
> = {
  success: {
    Icon: CheckCircle2,
    surface: "border-success/30 bg-success-surface",
    text: "text-success",
    label: "Sucesso",
  },
  warning: {
    Icon: AlertTriangle,
    surface: "border-warning/30 bg-warning-surface",
    text: "text-warning",
    label: "Aviso",
  },
  danger: {
    Icon: XCircle,
    surface: "border-danger/30 bg-danger-surface",
    text: "text-danger",
    label: "Erro",
  },
  info: {
    Icon: Info,
    surface: "border-info/30 bg-info-surface",
    text: "text-info",
    label: "Informação",
  },
}
