"use client"

import Link from "next/link"

const CURRENT_YEAR = new Date().getFullYear()

export function SiteFooter({ onOpenPreferences }: { onOpenPreferences: () => void }) {
  return (
    <footer className="mt-4 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
              O
            </span>
            <div>
              <p className="font-serif text-sm font-bold text-foreground">Órbita</p>
              <p className="text-xs text-muted-foreground">Notícias do mundo ao vivo</p>
            </div>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <Link
              href="/jogos"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Jogos
            </Link>
            <button
              type="button"
              onClick={onOpenPreferences}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Preferências
            </button>
            <Link
              href="/privacidade"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacidade
            </Link>
            <Link
              href="/termos"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Termos
            </Link>
            <a
              href="https://github.com/Heazts/orbita"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
        </div>
        <div className="flex flex-col justify-between gap-1 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p className="font-medium">© {CURRENT_YEAR} Órbita Notícias</p>
          <p>Feito com feeds RSS públicos e Google News</p>
        </div>
      </div>
    </footer>
  )
}
