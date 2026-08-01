"use client"

import { Eraser, RotateCcw, Timer, Trophy } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import {
  DIFFICULTIES,
  SIZE,
  colOf,
  findConflicts,
  generatePuzzle,
  holesFor,
  isComplete,
  rowOf,
  type Difficulty,
  type Grid,
  type Puzzle,
} from "@/lib/games/sudoku"
import { useHydratedState } from "@/hooks/use-hydrated-state"

// Best completion time (in seconds) per difficulty, kept in the browser only.
type BestTimes = Partial<Record<Difficulty, number>>

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

export function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medio")
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [grid, setGrid] = useState<Grid>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [bestTimes, setBestTimes] = useHydratedState<BestTimes>("orbita-sudoku-best", {})
  // Guards so a solved board is only recorded once per game.
  const recordedRef = useRef(false)
  // One entry per cell, so moving the selection can move focus with it.
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])

  const newGame = useCallback((level: Difficulty) => {
    const generated = generatePuzzle(Math.floor(Math.random() * 1_000_000_000), holesFor(level))
    setDifficulty(level)
    setPuzzle(generated)
    setGrid([...generated.puzzle])
    setSelected(null)
    setElapsed(0)
    recordedRef.current = false
  }, [])

  // Generate the first puzzle on the client only (random seed), exactly once.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    newGame("medio")
  }, [newGame])

  const conflicts = useMemo(() => (grid.length ? findConflicts(grid) : new Set<number>()), [grid])
  // Any complete, conflict-free board wins — not just the one the generator
  // happened to start from.
  const solved = useMemo(() => Boolean(puzzle) && isComplete(grid), [grid, puzzle])
  const remaining = useMemo(() => grid.filter((v) => v === 0).length, [grid])

  // The clock ticks while a puzzle is active and stops on solve.
  useEffect(() => {
    if (!puzzle || solved) return
    const id = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1_000)
    return () => window.clearInterval(id)
  }, [puzzle, solved])

  // Record the best time once per solved game.
  useEffect(() => {
    if (!solved || recordedRef.current) return
    recordedRef.current = true
    setBestTimes((prev) => {
      const previousBest = prev[difficulty]
      return previousBest === undefined || elapsed < previousBest
        ? { ...prev, [difficulty]: elapsed }
        : prev
    })
  }, [solved, elapsed, difficulty, setBestTimes])

  const setValue = useCallback(
    (value: number) => {
      if (selected === null || !puzzle || puzzle.givens[selected] || solved) return
      setGrid((current) => {
        const next = [...current]
        next[selected] = value
        return next
      })
    },
    [selected, puzzle, solved],
  )

  // Moves the selection by one cell, staying inside the board: the old version
  // stepped through the flat index, so ArrowLeft in the first column jumped to
  // the end of the row above and ArrowRight in the last column wrapped to the
  // row below. Focus follows the selection so a screen reader announces the
  // cell the player just moved to.
  const moveSelection = useCallback((from: number, dRow: number, dCol: number) => {
    const row = rowOf(from) + dRow
    const col = colOf(from) + dCol
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return
    const next = row * SIZE + col
    setSelected(next)
    cellRefs.current[next]?.focus()
  }, [])

  // Scoped to the board rather than the window: the previous listener consumed
  // digits and swallowed arrow-key scrolling anywhere on the page for as long
  // as a cell was selected, even with focus on another control.
  const onGridKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (selected === null) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key >= "1" && event.key <= "9") setValue(Number(event.key))
      else if (["0", "Backspace", "Delete"].includes(event.key)) setValue(0)
      else if (event.key === "ArrowLeft") moveSelection(selected, 0, -1)
      else if (event.key === "ArrowRight") moveSelection(selected, 0, 1)
      else if (event.key === "ArrowUp") moveSelection(selected, -1, 0)
      else if (event.key === "ArrowDown") moveSelection(selected, 1, 0)
      else return
      event.preventDefault()
    },
    [selected, setValue, moveSelection],
  )

  const selRow = selected === null ? -1 : rowOf(selected)
  const selCol = selected === null ? -1 : colOf(selected)
  const selValue = selected === null ? 0 : grid[selected]
  const best = bestTimes[difficulty]

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex rounded-full border p-1" role="tablist" aria-label="Dificuldade">
        {DIFFICULTIES.map((level) => (
          <button
            key={level.id}
            type="button"
            role="tab"
            aria-selected={difficulty === level.id}
            onClick={() => newGame(level.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${difficulty === level.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5 tabular-nums">
          <Timer className="size-3.5" aria-hidden="true" />
          {formatTime(elapsed)}
        </span>
        {best !== undefined && (
          <span className="flex items-center gap-1.5 tabular-nums">
            <Trophy className="size-3.5" aria-hidden="true" />
            Melhor: {formatTime(best)}
          </span>
        )}
      </div>

      <div
        role="group"
        aria-label="Grade do Sudoku"
        aria-describedby="sudoku-instrucoes"
        onKeyDown={onGridKeyDown}
        className="grid grid-cols-9 overflow-hidden rounded-lg border-2 border-foreground/60"
      >
        {grid.map((value, index) => {
          const given = puzzle?.givens[index]
          const row = rowOf(index)
          const col = colOf(index)
          const inConflict = conflicts.has(index)
          const isSelected = index === selected
          const related = !isSelected && (row === selRow || col === selCol)
          const sameValue = !isSelected && value !== 0 && value === selValue
          return (
            <button
              key={index}
              type="button"
              ref={(node) => {
                cellRefs.current[index] = node
              }}
              onClick={() => setSelected(index)}
              // Roving tabindex: Tab reaches the board once and the arrow keys
              // move within it, instead of eighty-one stops on the way past.
              tabIndex={index === (selected ?? 0) ? 0 : -1}
              aria-label={[
                `Linha ${row + 1}, coluna ${col + 1}`,
                value ? `valor ${value}` : "vazia",
                given ? "fixa" : null,
                // Conflicts are announced, not just coloured.
                inConflict ? "em conflito" : null,
              ]
                .filter(Boolean)
                .join(", ")}
              className={[
                "flex size-9 items-center justify-center text-lg font-bold tabular-nums transition-colors sm:size-10",
                col % 3 === 0 && col !== 0 ? "border-l-2 border-l-foreground/60" : "border-l border-l-border",
                row % 3 === 0 && row !== 0 ? "border-t-2 border-t-foreground/60" : "border-t border-t-border",
                isSelected ? "bg-primary/15" : sameValue ? "bg-primary/10" : related ? "bg-muted" : "bg-background",
                given ? "text-foreground" : "text-primary",
                // Underlined as well as coloured, so a conflict is still
                // visible without colour vision.
                inConflict ? "text-danger underline decoration-2 underline-offset-2" : "",
              ].join(" ")}
            >
              {value !== 0 ? value : ""}
            </button>
          )
        })}
      </div>

      <p id="sudoku-instrucoes" className="max-w-xs text-center text-xs text-muted-foreground">
        Use as setas para navegar pela grade e as teclas de 1 a 9 para preencher.
        Backspace apaga. Números em conflito aparecem sublinhados.
      </p>

      <p aria-live="polite" className="min-h-5 text-sm font-medium">
        {solved ? (
          <span className="font-bold text-success">Resolvido em {formatTime(elapsed)}! 🎉</span>
        ) : (
          <span className="text-muted-foreground">{remaining} células restantes</span>
        )}
      </p>

      <div className="grid w-full max-w-xs grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            disabled={selected === null || solved}
            className="flex h-12 items-center justify-center rounded-md bg-secondary text-lg font-bold text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setValue(0)}
          disabled={selected === null || solved}
          aria-label="Apagar"
          className="flex h-12 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors hover:bg-muted disabled:opacity-40"
        >
          <Eraser className="size-5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => newGame(difficulty)}
        className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors hover:bg-muted"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        Novo jogo
      </button>
    </div>
  )
}
