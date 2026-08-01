"use client"

import { CalendarDays, CornerDownLeft, Delete, RotateCcw, Share2, Shuffle } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ANSWERS,
  MAX_ATTEMPTS,
  WORD_LENGTH,
  currentDay,
  dailyAnswer,
  evaluateGuess,
  isValidGuess,
  isWin,
  keyboardHints,
  normalizeGuess,
  type LetterResult,
} from "@/lib/games/termo"
import {
  EMPTY_STATS,
  isTermoStats,
  recordResult,
  shareText,
  winRate,
  type TermoStats,
} from "@/lib/games/termo-stats"
import { useHydratedState } from "@/hooks/use-hydrated-state"
import { isCount, isPlainObject, isStringArray } from "@/lib/guards"
import { readStore, writeStore } from "@/lib/storage"

type Attempt = { guess: string; results: LetterResult[] }
type Mode = "daily" | "free"
// Saved progress for the daily game, keyed by day so yesterday's guesses are
// discarded automatically when a new word arrives.
type SavedDaily = { day: number; guesses: string[] }

// Restored progress is untrusted JSON. A malformed `guesses` used to reach
// `guesses.map(...)` below and take the whole page down with a TypeError.
function isSavedDaily(value: unknown): value is SavedDaily {
  return isPlainObject(value) && isCount(value.day) && isStringArray(value.guesses)
}

const DAILY_KEY = "orbita-termo-daily"
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]

function randomAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
}

// Status colours come from the design tokens rather than the raw Tailwind
// palette, so scripts/check-contrast.mjs actually covers them. The previous
// pairs failed WCAG 1.4.3: white on amber-500 is 2.15:1 and white on
// emerald-600 is 3.77:1, against a 4.5:1 minimum for the 14px keyboard keys.
const TILE_STYLES: Record<LetterResult, string> = {
  correct: "border-success bg-success text-success-foreground",
  present: "border-warning bg-warning text-warning-foreground",
  absent: "border-border bg-muted text-muted-foreground",
}

const KEY_STYLES: Record<LetterResult, string> = {
  correct: "bg-success text-success-foreground",
  present: "bg-warning text-warning-foreground",
  absent: "bg-muted text-muted-foreground",
}

// Green and amber are the classic red-green confusion pair, so colour alone
// cannot carry the result. "Present" also gets a ring marker in the corner;
// "correct" is the plain filled tile. The two are then told apart by shape,
// which survives any colour vision — and greyscale printing.
function PresentMarker() {
  return (
    <span
      aria-hidden="true"
      className="absolute right-1 top-1 size-2 rounded-full border-2 border-current opacity-90"
    />
  )
}

const RESULT_LABELS: Record<LetterResult, string> = {
  correct: "correta",
  present: "na palavra, em outra posição",
  absent: "não está na palavra",
}

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-2 py-3">
      <span className="text-xl font-bold tabular-nums">{value}</span>
      <span className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function TermoGame() {
  const [mode, setMode] = useState<Mode>("daily")
  const [answer, setAnswer] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [current, setCurrent] = useState("")
  // Transient feedback only (invalid guess / copied); win-loss text is derived.
  const [message, setMessage] = useState("")
  // Stats count only the daily game, where a streak means something.
  const [stats, setStats] = useHydratedState<TermoStats>("orbita-termo-stats", EMPTY_STATS, isTermoStats)

  const startDaily = useCallback(() => {
    const daily = dailyAnswer()
    const saved = readStore<SavedDaily | null>(DAILY_KEY, null, (value): value is SavedDaily | null =>
      value === null || isSavedDaily(value),
    )
    const guesses = saved && saved.day === currentDay() ? saved.guesses : []
    setMode("daily")
    setAnswer(daily)
    setAttempts(guesses.map((guess) => ({ guess, results: evaluateGuess(guess, daily) })))
    setCurrent("")
    setMessage("")
  }, [])

  const startFree = useCallback(() => {
    setMode("free")
    setAnswer(randomAnswer())
    setAttempts([])
    setCurrent("")
    setMessage("")
  }, [])

  // Initialize on the client only, so the answer never appears in the HTML and
  // there's no SSR/CSR mismatch. Guarded to run exactly once.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    startDaily()
  }, [startDaily])

  const won = useMemo(() => attempts.some((a) => isWin(a.results)), [attempts])
  const finished = won || attempts.length >= MAX_ATTEMPTS
  const hints = useMemo(() => keyboardHints(attempts), [attempts])

  const submit = useCallback(() => {
    if (finished || !answer) return
    if (!isValidGuess(current)) {
      setMessage("Digite uma palavra de 5 letras.")
      return
    }
    const guess = normalizeGuess(current)
    const results = evaluateGuess(guess, answer)
    const next = [...attempts, { guess, results }]
    setAttempts(next)
    setCurrent("")
    setMessage("")
    if (mode === "daily") {
      const day = currentDay()
      writeStore(DAILY_KEY, { day, guesses: next.map((a) => a.guess) })
      const wonNow = isWin(results)
      // Record stats at submit time (not in an effect), so a restored finished
      // game is never counted twice.
      if (wonNow || next.length >= MAX_ATTEMPTS) {
        setStats((prev) => recordResult(prev, wonNow, next.length, day))
      }
    }
  }, [answer, attempts, current, finished, mode, setStats])

  const share = useCallback(async () => {
    const title =
      mode === "daily"
        ? `Termo Órbita — ${new Date().toLocaleDateString("pt-BR")}`
        : "Termo Órbita"
    const text = shareText(title, attempts.map((a) => a.results), won, MAX_ATTEMPTS)
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        setMessage("Resultado copiado!")
      }
    } catch {
      // Share sheet dismissed — nothing to report.
    }
  }, [attempts, mode, won])

  const press = useCallback(
    (key: string) => {
      if (finished) return
      if (key === "ENTER") return submit()
      if (key === "BACK") return setCurrent((c) => c.slice(0, -1))
      if (/^[A-Z]$/.test(key)) setCurrent((c) => (c.length < WORD_LENGTH ? c + key : c))
    },
    [finished, submit],
  )

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === "Enter") press("ENTER")
      else if (event.key === "Backspace") press("BACK")
      else {
        const letter = normalizeGuess(event.key)
        if (letter.length === 1) press(letter)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [press])

  const statusText = won
    ? "Acertou! 🎉"
    : finished && answer
      ? `A palavra era ${answer}.`
      : message

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Tab list for game mode selection */}
      <div className="flex rounded-full border p-1" role="tablist" aria-label="Modo de jogo">
        <button
          type="button"
          role="tab"
          id="tab-daily"
          aria-selected={mode === "daily"}
          aria-controls="panel-termo"
          onClick={startDaily}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${mode === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Palavra do dia
        </button>
        <button
          type="button"
          role="tab"
          id="tab-free"
          aria-selected={mode === "free"}
          aria-controls="panel-termo"
          onClick={startFree}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${mode === "free" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Shuffle className="size-3.5" aria-hidden="true" />
          Modo livre
        </button>
      </div>

      {/* Tab panel — wraps the entire game area */}
      <div
        id="panel-termo"
        role="tabpanel"
        aria-labelledby={mode === "daily" ? "tab-daily" : "tab-free"}
        className="flex flex-col items-center gap-5"
      >
        <div className="grid gap-1.5" role="grid" aria-label="Tabuleiro do Termo">
          {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
            const attempt = attempts[row]
            const isCurrentRow = row === attempts.length && !finished
            return (
              <div key={row} className="flex gap-1.5" role="row">
                {Array.from({ length: WORD_LENGTH }).map((_, col) => {
                  const letter = attempt ? attempt.guess[col] : isCurrentRow ? current[col] ?? "" : ""
                  const result = attempt?.results[col]
                  const filledCurrent = isCurrentRow && Boolean(current[col])
                  return (
                    <div
                      key={col}
                      role="gridcell"
                      // Without this a screen reader reads five bare letters and
                      // none of the result the colours are conveying.
                      aria-label={
                        result && letter
                          ? `${letter}, ${RESULT_LABELS[result]}`
                          : letter || "vazia"
                      }
                      className={`relative flex size-13 items-center justify-center rounded-md border-2 text-2xl font-bold uppercase transition-colors sm:size-14 ${
                        result
                          ? TILE_STYLES[result]
                          : filledCurrent
                            ? "border-foreground/40 bg-background"
                            : "border-border bg-background"
                      }`}
                    >
                      {letter}
                      {result === "present" && <PresentMarker />}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <p aria-live="polite" className="min-h-5 text-sm font-medium text-muted-foreground">
          {statusText}
        </p>

        {finished && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => void share()}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Share2 className="size-4" aria-hidden="true" />
              Compartilhar
            </button>
            {mode === "free" ? (
              <button
                type="button"
                onClick={startFree}
                className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Jogar de novo
              </button>
            ) : (
              <p className="w-full text-center text-xs text-muted-foreground">
                Volte amanhã para a próxima palavra — ou treine no modo livre.
              </p>
            )}
          </div>
        )}

        <div className="flex w-full max-w-md flex-col gap-1.5">
          {KEY_ROWS.map((rowKeys, index) => (
            <div key={rowKeys} className="flex justify-center gap-1.5">
              {index === KEY_ROWS.length - 1 && (
                <button
                  type="button"
                  onClick={() => press("ENTER")}
                  aria-label="Enviar palavra"
                  className="flex h-12 items-center justify-center rounded-md bg-secondary px-2.5 text-xs font-bold uppercase text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <CornerDownLeft className="size-4" aria-hidden="true" />
                </button>
              )}
              {rowKeys.split("").map((key) => {
                const hint = hints[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => press(key)}
                    aria-label={hint ? `${key}, ${RESULT_LABELS[hint]}` : key}
                    className={`relative flex h-12 flex-1 items-center justify-center rounded-md text-sm font-bold uppercase transition-colors ${hint ? KEY_STYLES[hint] : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
                  >
                    {key}
                    {hint === "present" && <PresentMarker />}
                  </button>
                )
              })}
              {index === KEY_ROWS.length - 1 && (
                <button
                  type="button"
                  onClick={() => press("BACK")}
                  aria-label="Apagar letra"
                  className="flex h-12 items-center justify-center rounded-md bg-secondary px-2.5 text-xs font-bold uppercase text-secondary-foreground transition-colors hover:bg-muted"
                >
                  <Delete className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* The marker is only useful if the reader knows what it means. */}
        <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-4 rounded-sm border-2 border-success bg-success"
            />
            Letra correta
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="relative size-4 rounded-sm border-2 border-warning bg-warning text-warning-foreground"
            >
              <span className="absolute right-px top-px size-1.5 rounded-full border border-current" />
            </span>
            Letra na palavra, em outra posição
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-4 rounded-sm border-2 border-border bg-muted" />
            Letra ausente
          </li>
        </ul>

        {mode === "daily" && stats.played > 0 && (
          <section aria-label="Estatísticas" className="grid w-full max-w-md grid-cols-4 gap-2">
            <StatTile value={stats.played} label="Jogos" />
            <StatTile value={`${winRate(stats)}%`} label="Vitórias" />
            <StatTile value={stats.currentStreak} label="Sequência" />
            <StatTile value={stats.bestStreak} label="Melhor" />
          </section>
        )}
      </div>{/* end panel-termo */}
    </div>
  )
}
