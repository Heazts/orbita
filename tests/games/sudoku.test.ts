import { describe, expect, it } from "vitest"
import {
  CELLS,
  DIFFICULTIES,
  SIZE,
  type Grid,
  boxOf,
  dailySeed,
  findConflicts,
  generatePuzzle,
  holesFor,
  isComplete,
  isSolved,
  scrambledSolution,
} from "@/lib/games/sudoku"

const FULL = "1,2,3,4,5,6,7,8,9"

function unitsAreComplete(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r += 1) {
    const row = new Set<number>()
    const col = new Set<number>()
    for (let c = 0; c < SIZE; c += 1) {
      row.add(grid[r * SIZE + c])
      col.add(grid[c * SIZE + r])
    }
    if ([...row].sort((a, b) => a - b).join() !== FULL) return false
    if ([...col].sort((a, b) => a - b).join() !== FULL) return false
  }
  const boxes: Set<number>[] = Array.from({ length: SIZE }, () => new Set<number>())
  for (let i = 0; i < CELLS; i += 1) boxes[boxOf(i)].add(grid[i])
  return boxes.every((box) => [...box].sort((a, b) => a - b).join() === FULL)
}

describe("scrambledSolution", () => {
  it("produces a valid completed Sudoku for several seeds", () => {
    for (const seed of [1, 2, 42, 1000, 99999]) {
      expect(unitsAreComplete(scrambledSolution(seed))).toBe(true)
    }
  })

  it("is deterministic per seed", () => {
    expect(scrambledSolution(7)).toEqual(scrambledSolution(7))
  })

  it("varies across seeds", () => {
    expect(scrambledSolution(1)).not.toEqual(scrambledSolution(2))
  })
})

describe("generatePuzzle", () => {
  it("keeps the reference solution valid and blanks the requested cells", () => {
    const { puzzle, solution, givens } = generatePuzzle(123, 45)
    expect(unitsAreComplete(solution)).toBe(true)
    expect(puzzle).toHaveLength(CELLS)
    // Every clue matches the solution; blanks are 0.
    for (let i = 0; i < CELLS; i += 1) {
      if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i])
      expect(givens[i]).toBe(puzzle[i] !== 0)
    }
    expect(givens.filter(Boolean)).toHaveLength(CELLS - 45)
  })

  it("is deterministic per seed", () => {
    expect(generatePuzzle(500, 40)).toEqual(generatePuzzle(500, 40))
  })
})

describe("findConflicts", () => {
  it("finds no conflicts in a valid solution", () => {
    expect(findConflicts(scrambledSolution(3)).size).toBe(0)
  })

  it("flags duplicates in a row", () => {
    const grid: Grid = new Array(CELLS).fill(0)
    grid[0] = 5
    grid[1] = 5 // same row, same value
    const conflicts = findConflicts(grid)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(1)).toBe(true)
  })

  it("ignores empty cells", () => {
    const grid: Grid = new Array(CELLS).fill(0)
    expect(findConflicts(grid).size).toBe(0)
  })
})

describe("isComplete / isSolved", () => {
  it("isComplete is true for a valid full grid and false with a blank", () => {
    const solution = scrambledSolution(9)
    expect(isComplete(solution)).toBe(true)
    const withBlank = [...solution]
    withBlank[10] = 0
    expect(isComplete(withBlank)).toBe(false)
  })

  it("isSolved compares against the reference solution", () => {
    const { solution } = generatePuzzle(11, 40)
    expect(isSolved(solution, solution)).toBe(true)
    const wrong = [...solution]
    wrong[0] = wrong[0] === 1 ? 2 : 1
    expect(isSolved(wrong, solution)).toBe(false)
  })
})

describe("difficulties", () => {
  it("orders levels from more clues to fewer and stays within the board", () => {
    const holes = DIFFICULTIES.map((d) => d.holes)
    expect(holes).toEqual([...holes].sort((a, b) => a - b))
    for (const h of holes) {
      expect(h).toBeGreaterThan(0)
      expect(h).toBeLessThan(CELLS)
    }
  })

  it("holesFor matches the presets and generates that many blanks", () => {
    for (const level of DIFFICULTIES) {
      expect(holesFor(level.id)).toBe(level.holes)
      const { puzzle } = generatePuzzle(77, holesFor(level.id))
      expect(puzzle.filter((v) => v === 0)).toHaveLength(level.holes)
    }
  })
})

describe("dailySeed", () => {
  it("is stable within a day and differs across days", () => {
    expect(dailySeed(new Date("2026-07-24T01:00:00Z"))).toBe(dailySeed(new Date("2026-07-24T20:00:00Z")))
    expect(dailySeed(new Date("2026-07-24T12:00:00Z"))).not.toBe(dailySeed(new Date("2026-07-25T12:00:00Z")))
  })
})
