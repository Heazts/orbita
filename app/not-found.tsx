import type { Metadata } from "next"
import Link from "next/link"
import { Gamepad2, Newspaper } from "lucide-react"

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center text-foreground">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-black text-primary-foreground">
        O
      </span>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-destructive">Erro 404</p>
      <h1 className="mt-2 text-balance font-serif text-3xl font-bold md:text-4xl">
        Esta página saiu de órbita
      </h1>
      <p className="mt-3 max-w-sm text-pretty text-sm text-muted-foreground">
        O endereço que você abriu não existe ou foi movido. Que tal voltar para as notícias?
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Newspaper className="size-4" aria-hidden="true" />
          Ver as notícias
        </Link>
        <Link
          href="/jogos"
          className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
        >
          <Gamepad2 className="size-4" aria-hidden="true" />
          Jogos
        </Link>
      </div>
    </div>
  )
}
