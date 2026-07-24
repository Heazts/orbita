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
import { EMPTY_STATS, recordResult, shareText, winRate, type TermoStats } from "@/lib/games/termo-stats"
import { useHydratedState } from "@/hooks/use-hydrated-state"
import { readStore, writeStore } from "@/lib/storage"

type Attempt = { guess: string; results: LetterResult[] }
type Mode = "daily" | "free"
// Saved progress for the daily game, keyed by day so yesterday's guesses are
// discarded automatically when a new word arrives.
type SavedDaily = { day: number; guesses: string[] }

const DAILY_KEY = "orbita-termo-daily"
const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]

function randomAnswer(): string {
  return ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
}

const TILE_STYLES: Record<LetterResult, string> = {
  correct: "border-emerald-600 bg-emerald-600 text-white",
  present: "border-amber-500 bg-amber-500 text-white",
  absent: "border-border bg-muted text-muted-foreground",
}

const KEY_STYLES: Record<LetterResult, string> = {
  correct: "bg-emerald-600 text-white",
  present: "bg-amber-500 text-white",
  absent: "bg-muted text-muted-foreground/60",
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
  const [stats, setStats] = useHydratedState<TermoStats>("orbita-termo-stats", EMPTY_STATS)

  const startDaily = useCallback(() => {
    const daily = dailyAnswer()
    const saved = readStore<SavedDaily | null>(DAILY_KEY, null)
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
      writeStore(DAILY_KEY, { day: currentDay(), guesses: next.map((a) => a.guess) })
      const wonNow = isWin(results)
      // Record stats at submit time (not in an effect), so a restored finished
      // game is never counted twice.
      if (wonNow || next.length >= MAX_ATTEMPTS) {
        setStats((prev) => recordResult(prev, wonNow, next.length))
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
      <div className="flex rounded-full border p-1" role="tablist" aria-label="Modo de jogo">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "daily"}
          onClick={startDaily}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${mode === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CalendarDays className="size-3.5" aria-hidden="true" />
          Palavra do dia
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "free"}
          onClick={startFree}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${mode === "free" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Shuffle className="size-3.5" aria-hidden="true" />
          Modo livre
        </button>
      </div>

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
                    className={`flex size-13 items-center justify-center rounded-md border-2 text-2xl font-bold uppercase transition-colors sm:size-14 ${
                      result
                        ? TILE_STYLES[result]
                        : filledCurrent
                          ? "border-foreground/40 bg-background"
                          : "border-border bg-background"
                    }`}
                  >
                    {letter}
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
                  className={`flex h-12 flex-1 items-center justify-center rounded-md text-sm font-bold uppercase transition-colors ${hint ? KEY_STYLES[hint] : "bg-secondary text-secondary-foreground hover:bg-muted"}`}
                >
                  {key}
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

      {mode === "daily" && stats.played > 0 && (
        <section aria-label="Estatísticas" className="grid w-full max-w-md grid-cols-4 gap-2">
          <StatTile value={stats.played} label="Jogos" />
          <StatTile value={`${winRate(stats)}%`} label="Vitórias" />
          <StatTile value={stats.currentStreak} label="Sequência" />
          <StatTile value={stats.bestStreak} label="Melhor" />
        </section>
      )}
    </div>
  )
}
