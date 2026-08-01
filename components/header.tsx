"use client"

import {
  Bookmark,
  Gamepad2,
  GraduationCap,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react"
import Link from "next/link"
import type { Theme } from "@/hooks/use-theme"
import { IconButton } from "@/components/ui/icon-button"
import { OrbitaMark } from "@/components/ui/orbita-mark"

type HeaderProps = {
  input: string
  onInputChange: (value: string) => void
  filtersOpen: boolean
  onFiltersOpenChange: (open: boolean) => void
  favoritesOnly: boolean
  onFavoritesOnlyChange: (only: boolean) => void
  favoritesCount: number
  isValidating: boolean
  hasData: boolean
  newCount: number
  isLive: boolean
  onRefresh: () => void
  preferencesOpen: boolean
  onPreferencesToggle: () => void
  // Theme state lives in the dashboard (single useTheme instance) so the
  // header toggle and the preferences panel stay in sync.
  theme: Theme
  onToggleTheme: () => void
}

export function Header({
  input,
  onInputChange,
  filtersOpen,
  onFiltersOpenChange,
  favoritesOnly,
  onFavoritesOnlyChange,
  favoritesCount,
  isValidating,
  hasData,
  newCount,
  isLive,
  onRefresh,
  preferencesOpen,
  onPreferencesToggle,
  theme,
  onToggleTheme,
}: HeaderProps) {
  // "/" is bound globally by ShortcutsProvider, which finds this field by its
  // type="search" — hence no ref here. Two handlers for the same key meant
  // whichever ran second re-focused an already focused field, and only one of
  // them respected the shortcuts preference.
  const showLiveIndicator = isLive && hasData

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* The skip link lives in app/layout.tsx so it exists on every page and is
          genuinely the first focusable element in the document. It used to be
          here, which meant it only existed on pages rendering this header, and
          anything focusable earlier in the DOM came before it. */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8 md:py-4">
        <Link
          href="/"
          className="orbita-mark-link flex items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Órbita — página inicial"
        >
          {/* Inline, not <img src="/icon.svg">. Measured both: the markup is
              844 bytes gzipped, cheaper than a second request, and it cannot
              flash in after paint. No aria-label — the link already carries
              its accessible name, and naming the mark too would make a screen
              reader announce it twice.

              orbita-mark drives the drift animation in globals.css, which is
              purely decorative and disabled under both reduced-motion paths. */}
          <OrbitaMark className="orbita-mark size-9" />
          <span className="font-serif text-xl font-bold tracking-tight">ÓRBITA</span>
        </Link>
        <div className="flex items-center gap-2">
          {showLiveIndicator && (
            <span className="live-badge hidden items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase text-destructive md:flex">
              <span className="live-dot size-2 rounded-full bg-destructive" />
              Ao vivo
            </span>
          )}
          <Link
            href="/estudantes"
            aria-label="Área do estudante"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all duration-150 hover:bg-muted hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GraduationCap className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/jogos"
            aria-label="Jogos"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all duration-150 hover:bg-muted hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Gamepad2 className="size-4" aria-hidden="true" />
          </Link>
          <IconButton
            label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={onToggleTheme}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
          <IconButton
            label="Preferências"
            active={preferencesOpen}
            onClick={onPreferencesToggle}
          >
            <Settings2 className="size-4" />
          </IconButton>
          <div className="relative">
            <IconButton
              // The badge beside this button is aria-hidden, so the count has
              // to reach a screen reader through the name or not at all.
              label={
                isValidating
                  ? "Atualizando..."
                  : newCount > 0
                    ? `Atualizar notícias (${newCount} ${newCount === 1 ? "nova" : "novas"})`
                    : "Atualizar notícias"
              }
              onClick={onRefresh}
            >
              <RefreshCw className={`size-4 transition-transform ${isValidating ? "animate-spin" : ""}`} />
            </IconButton>
            {newCount > 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground"
              >
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-3 md:px-8 md:pb-4">
        {/* role="search" landmarks the search area for assistive technologies. */}
        <form role="search" aria-label="Busca de notícias" className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border bg-muted px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring md:py-3">
            <Search className="size-5 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Pesquisar notícias em toda a internet</span>
            <input
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              type="search"
              maxLength={120}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Pesquise qualquer assunto... (atalho: /)"
            />
            {input && (
              <button
                type="button"
                onClick={() => onInputChange("")}
                aria-label={`Limpar pesquisa por "${input}"`}
                className="rounded-full p-1 transition-colors hover:bg-foreground/10"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </label>
          <IconButton
            label="Abrir filtros"
            active={filtersOpen}
            onClick={() => onFiltersOpenChange(!filtersOpen)}
          >
            <SlidersHorizontal className="size-4" />
          </IconButton>
          <div className="relative">
            <IconButton
              label={
                favoritesCount > 0
                  ? `Ver favoritos (${favoritesCount})`
                  : "Ver favoritos"
              }
              active={favoritesOnly}
              onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
            >
              <Bookmark className="size-4" fill={favoritesOnly ? "currentColor" : "none"} />
            </IconButton>
            {favoritesCount > 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground"
              >
                {favoritesCount > 99 ? "99+" : favoritesCount}
              </span>
            )}
          </div>
        </form>
      </div>
    </header>
  )
}