import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Grid3x3, WholeWord } from "lucide-react"

export const metadata: Metadata = {
  title: "Jogos",
  description: "Uma pausa leve entre as notícias: Termo e Sudoku para jogar direto no navegador.",
  alternates: { canonical: "/jogos" },
}

const GAMES = [
  {
    href: "/jogos/termo",
    name: "Termo",
    description: "Descubra a palavra de 5 letras em 6 tentativas.",
    Icon: WholeWord,
  },
  {
    href: "/jogos/sudoku",
    name: "Sudoku",
    description: "Complete a grade 9×9 sem repetir números.",
    Icon: Grid3x3,
  },
]

export default function JogosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para as notícias
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-12">
        <h1 className="text-balance font-serif text-3xl font-bold md:text-4xl">Jogos</h1>
        <p className="mt-2 text-sm text-muted-foreground">Uma pausa leve entre as notícias.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {GAMES.map((game) => (
            <Link
              key={game.href}
              href={game.href}
              className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary hover:bg-muted/40"
            >
              <div
                className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <game.Icon className="size-6" />
              </div>
              <h2 className="mt-3 font-serif text-xl font-bold">{game.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{game.description}</p>
              <span className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-primary transition-opacity group-hover:opacity-100 sm:opacity-0">
                Jogar →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
