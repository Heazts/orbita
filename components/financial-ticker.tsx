"use client"

import { useEffect, useState } from "react"
import type { FinancialIndicator } from "@/lib/finance"
import { Activity, Minus, TrendingDown, TrendingUp } from "lucide-react"

const TREND_STYLES = {
  up: {
    Icon: TrendingUp,
    badgeClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  down: {
    Icon: TrendingDown,
    badgeClass: "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
  flat: {
    Icon: Minus,
    badgeClass: "bg-muted border-border text-muted-foreground",
  },
} as const

export function FinancialTicker() {
  const [indicators, setIndicators] = useState<FinancialIndicator[]>([])
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/finance")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: FinancialIndicator[]) => {
        if (!cancelled) setIndicators(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (indicators.length === 0 && !failed) return null

  return (
    <section aria-labelledby="mercado-heading" className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" aria-hidden="true" />
          <h2 id="mercado-heading" className="text-xs font-bold uppercase tracking-widest text-foreground">
            Mercado & Indicadores Econômicos
          </h2>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground">
          Fontes em tempo real: AwesomeAPI & Banco Central do Brasil
        </p>
      </div>

      {failed ? (
        <p className="text-xs text-muted-foreground">
          Não foi possível carregar os indicadores agora. Tente novamente em instantes.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {indicators.map((item) => {
            const { Icon, badgeClass } = TREND_STYLES[item.trend]
            return (
              <li
                key={item.symbol}
                className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-background/80 p-3.5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {item.name}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${badgeClass}`}>
                      <Icon className="size-3 shrink-0" aria-hidden="true" />
                      {item.change}
                    </span>
                  </div>
                  <span className="mt-2 block font-mono text-base font-black tabular-nums tracking-tight text-foreground">
                    {item.price}
                  </span>
                </div>
                <span className="mt-2.5 text-[10px] font-medium leading-tight text-muted-foreground/80 group-hover:text-muted-foreground">
                  {item.note}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
