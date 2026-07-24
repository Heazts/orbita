"use client"

import { Clock3 } from "lucide-react"

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
})

type PageHeadingProps = {
  favoritesOnly: boolean
  isLive: boolean
  query: string
  count: number
  busy: boolean
  updatedAt: string | undefined
  // Client clock; null before hydration, when we can't format a local time yet.
  now: number | null
}

export function PageHeading({
  favoritesOnly,
  isLive,
  query,
  count,
  busy,
  updatedAt,
  now,
}: PageHeadingProps) {
  const kicker = favoritesOnly
    ? "Sua coleção"
    : isLive
      ? "Transmissão ao vivo"
      : query
        ? "Pesquisa global"
        : "Edição contínua"

  const title = favoritesOnly ? "Favoritos" : query ? `Resultados para "${query}"` : "Notícias em destaque"

  // Prefer the server's timestamp; fall back to the client clock. Before
  // hydration neither exists, so the time is omitted rather than showing the
  // Unix epoch.
  const timestamp = updatedAt ? Date.parse(updatedAt) : now
  const timeLabel = timestamp !== null && !Number.isNaN(timestamp) ? timeFormatter.format(timestamp) : null

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-primary pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-destructive">{kicker}</p>
        <h1 className="text-balance font-serif text-3xl font-bold md:text-4xl">{title}</h1>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-4" aria-hidden="true" />
        {busy ? (
          <span className="flex items-center gap-2">
            <span className="inline-block size-1.5 rounded-full bg-destructive motion-safe:animate-pulse" />
            Buscando...
          </span>
        ) : (
          `${count} ${count === 1 ? "matéria" : "matérias"}${timeLabel ? ` · ${timeLabel}` : ""}`
        )}
      </div>
    </div>
  )
}
