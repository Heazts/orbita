"use client"

import { Check, Monitor, Moon, Sun } from "lucide-react"
import type { NewsTone } from "@/hooks/use-preferences"
import { usePreferences } from "@/hooks/use-preferences"
import type { ThemeMode } from "@/hooks/use-theme"

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border bg-background p-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex flex-col">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </span>
    </button>
  )
}

const TONE_OPTIONS: { value: NewsTone; label: string; hint: string }[] = [
  { value: "balanced", label: "Equilibrado", hint: "Menos notícias pesadas ao navegar" },
  { value: "all", label: "Completo", hint: "Mostra tudo, sem filtro de tom" },
]

const THEME_OPTIONS: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Claro", Icon: Sun },
  { value: "dark", label: "Escuro", Icon: Moon },
  { value: "system", label: "Sistema", Icon: Monitor },
]

type PreferencesProps = {
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

export function Preferences({ themeMode, onThemeModeChange }: PreferencesProps) {
  const { prefs, setPreference } = usePreferences()

  return (
    <section
      aria-label="Preferências"
      className="mt-3 flex flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5"
    >
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Tema
        </p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
          {THEME_OPTIONS.map((option) => {
            const active = themeMode === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onThemeModeChange(option.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}
              >
                <option.Icon className="size-4" aria-hidden="true" />
                <span className="text-xs font-bold">{option.label}</span>
              </button>
            )
          })}
        </div>
        {themeMode === "system" && (
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Acompanha automaticamente o tema do seu aparelho.
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Tom das notícias
        </p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tom das notícias">
          {TONE_OPTIONS.map((option) => {
            const active = prefs.tone === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPreference("tone", option.value)}
                className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted/50"}`}
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  {active && <Check className="size-3.5" aria-hidden="true" />}
                  {option.label}
                </span>
                <span className={`text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  {option.hint}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Toggle
        label="Avisos de novas matérias"
        description="Mostra o aviso discreto quando chegam notícias novas"
        checked={prefs.newAlerts}
        onChange={(value) => setPreference("newAlerts", value)}
      />

      <Toggle
        label="Reduzir animações"
        description="Desliga o letreiro e as transições de entrada"
        checked={prefs.reduceMotion}
        onChange={(value) => setPreference("reduceMotion", value)}
      />

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Suas preferências ficam salvas apenas neste navegador. Saiba mais na{" "}
        <a href="/privacidade" className="underline underline-offset-2 hover:text-foreground">
          Política de Privacidade
        </a>
        .
      </p>
    </section>
  )
}
