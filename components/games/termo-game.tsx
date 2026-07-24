"use client"

import { Delete, CornerDownLeft, RotateCcw } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ANSWERS,
  MAX_ATTEMPTS,
  WORD_LENGTH,
  evaluateGuess,
  isValidGuess,
  isWin,
  keyboardHints,
  normalizeGuess,
  type LetterResult,
} from "@/lib/games/termo"

type Attempt = { guess: string; results: LetterResult[] }

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

export function TermoGame() {
  const [answer, setAnswer] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [current, setCurrent] = useState("")
  const [message, setMessage] = useState("")

  // Pick the word on the client only, so nothing is revealed in the HTML and
  // there's no SSR/CSR mismatch. Guarded so it initializes exactly once.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    setAnswer(randomAnswer())
  }, [])

  const won = useMemo(() => attempts.some((a) => isWin(a.results)), [attempts])
  const finished = won || attempts.length >= MAX_ATTEMPTS
  const hints = useMemo(() => keyboardHints(attempts), [attempts])

  const reset = useCallback(() => {
    setAnswer(randomAnswer())
    setAttempts([])
    setCurrent("")
    setMessage("")
  }, [])

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
    if (isWin(results)) setMessage("Acertou! 🎉")
    else if (next.length >= MAX_ATTEMPTS) setMessage(`A palavra era ${answer}.`)
    else setMessage("")
  }, [answer, attempts, current, finished])

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

  return (
    <div className="flex flex-col items-center gap-5">
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
        {message}
      </p>

      {finished && (
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Jogar de novo
        </button>
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
    </div>
  )
}
