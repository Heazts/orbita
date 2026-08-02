"use client"

import Link from "next/link"
import { OrbitaMark } from "@/components/ui/orbita-mark"

// Shared by all six items so a <button> and an <a> render as the same box.
// They read as one row of equivalent choices, so they have to sit on one line.
const FOOTER_LINK =
  "inline-flex items-center font-medium leading-none text-muted-foreground transition-colors hover:text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function SiteFooter({ onOpenPreferences }: { onOpenPreferences: () => void }) {
  // Computed at render time, not at module load time, so cached production
  // builds always show the correct year after a year boundary.
  const currentYear = new Date().getFullYear()
  return (
    <footer className="mt-4 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <OrbitaMark className="size-8" />
            <div>
              <p className="font-serif text-sm font-bold text-foreground">Órbita</p>
              <p className="text-xs text-muted-foreground">Notícias do mundo ao vivo</p>
            </div>
          </div>
          <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <Link href="/estudantes" className={FOOTER_LINK}>
              Estudantes
            </Link>
            <Link href="/jogos" className={FOOTER_LINK}>
              Jogos
            </Link>
            <button type="button" onClick={onOpenPreferences} className={FOOTER_LINK}>
              Preferências
            </button>
            <Link href="/privacidade" className={FOOTER_LINK}>
              Privacidade
            </Link>
            <Link href="/termos" className={FOOTER_LINK}>
              Termos
            </Link>
            <a
              href="https://github.com/Heazts/orbita"
              target="_blank"
              rel="noopener noreferrer"
              className={FOOTER_LINK}
            >
              GitHub
            </a>
          </nav>
        </div>
        <div className="flex flex-col justify-between gap-1 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p className="font-medium">© {currentYear} Órbita Notícias</p>
          <p>Feito com feeds RSS públicos e Google News</p>
        </div>
      </div>
    </footer>
  )
}
