type Period = "all" | "1" | "7" | "30" | "live"
type Sort = "latest" | "relevance"

type FiltersProps = {
  period: Period
  onPeriodChange: (period: Period) => void
  sort: Sort
  onSortChange: (sort: Sort) => void
  source: string
  onSourceChange: (source: string) => void
  sources: string[]
}

export function Filters({
  period,
  onPeriodChange,
  sort,
  onSortChange,
  source,
  onSourceChange,
  sources,
}: FiltersProps) {
  const activeCount = [
    period !== "all",
    sort !== "latest",
    source !== "Todas",
  ].filter(Boolean).length

  return (
    <div className="mt-3 rounded-2xl border bg-card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Filtros{activeCount > 0 ? ` (${activeCount})` : ""}
        </span>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => {
              onPeriodChange("all")
              onSortChange("latest")
              onSourceChange("Todas")
            }}
            className="text-xs font-medium text-destructive transition-opacity hover:opacity-70"
          >
            Limpar filtros
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs font-bold">
          Período
          <select
            value={period}
            onChange={(event) => onPeriodChange(event.target.value as Period)}
            className="rounded-lg border bg-background p-2.5 text-sm font-normal transition-colors focus:ring-2 focus:ring-ring"
          >
            <option value="all">Qualquer data</option>
            <option value="live">🔴 Ao vivo (últimas 2h)</option>
            <option value="1">Últimas 24 horas</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold">
          Ordenar
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as Sort)}
            className="rounded-lg border bg-background p-2.5 text-sm font-normal transition-colors focus:ring-2 focus:ring-ring"
          >
            <option value="latest">Mais recentes</option>
            <option value="relevance">Mais relevantes</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold">
          Fonte
          <select
            value={source}
            onChange={(event) => onSourceChange(event.target.value)}
            className="rounded-lg border bg-background p-2.5 text-sm font-normal transition-colors focus:ring-2 focus:ring-ring"
          >
            {sources.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}