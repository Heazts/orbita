"use client"

import {
  Bookmark,
  Gamepad2,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import { useSearchShortcut } from "@/hooks/use-search-shortcut"
import type { Theme } from "@/hooks/use-theme"
import { IconButton } from "@/components/ui/icon-button"

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
  const searchRef = useRef<HTMLInputElement>(null)
  useSearchShortcut(searchRef)

  const showLiveIndicator = isLive && hasData

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3 md:px-8 md:py-4">
        <a
          href="#conteudo"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
            O
          </span>
          <span className="font-serif text-xl font-bold">ÓRBITA</span>
        </a>
        <div className="flex items-center gap-2">
          {showLiveIndicator && (
            <span className="live-badge hidden items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-bold uppercase text-destructive md:flex">
              <span className="live-dot size-2 rounded-full bg-destructive" />
              Ao vivo
            </span>
          )}
          <Link
            href="/jogos"
            aria-label="Jogos"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-all duration-150 hover:bg-muted hover:shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Gamepad2 className="size-4" />
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
              label={isValidating ? "Atualizando..." : "Atualizar notícias"}
              onClick={onRefresh}
            >
              <RefreshCw className={`size-4 transition-transform ${isValidating ? "animate-spin" : ""}`} />
            </IconButton>
            {newCount > 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
              >
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-3 md:px-8 md:pb-4">
        <div className="flex gap-2">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border bg-muted px-4 py-2.5 focus-within:ring-2 focus-within:ring-ring md:py-3">
            <Search className="size-5 text-muted-foreground" />
            <span className="sr-only">Pesquisar notícias em toda a internet</span>
            <input
              ref={searchRef}
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
                aria-label="Limpar pesquisa"
                className="rounded-full p-1 transition-colors hover:bg-foreground/10"
              >
                <X className="size-4" />
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
              label="Ver favoritos"
              active={favoritesOnly}
              onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
            >
              <Bookmark className="size-4" fill={favoritesOnly ? "currentColor" : "none"} />
            </IconButton>
            {favoritesCount > 0 && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
              >
                {favoritesCount > 99 ? "99+" : favoritesCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}