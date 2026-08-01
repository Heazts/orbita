import { describe, expect, it } from "vitest"
import {
  CELLS,
  DIFFICULTIES,
  SIZE,
  type Grid,
  boxOf,
  countSolutions,
  findConflicts,
  generatePuzzle,
  hasUniqueSolution,
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

// Two rows in the same band and two columns in different stacks whose four
// cells hold the same two digits crosswise. Blanking all four lets the pair be
// swapped without breaking any row, column or box, so the board has exactly two
// completions — the smallest honest example of an ambiguous puzzle.
function findSwappableRectangle(grid: Grid): number[] | null {
  for (let r1 = 0; r1 < SIZE; r1 += 1) {
    for (let r2 = r1 + 1; r2 < SIZE; r2 += 1) {
      if (Math.floor(r1 / 3) !== Math.floor(r2 / 3)) continue
      for (let c1 = 0; c1 < SIZE; c1 += 1) {
        for (let c2 = c1 + 1; c2 < SIZE; c2 += 1) {
          if (Math.floor(c1 / 3) === Math.floor(c2 / 3)) continue
          const a = grid[r1 * SIZE + c1]
          const b = grid[r1 * SIZE + c2]
          if (grid[r2 * SIZE + c1] === b && grid[r2 * SIZE + c2] === a) {
            return [r1 * SIZE + c1, r1 * SIZE + c2, r2 * SIZE + c1, r2 * SIZE + c2]
          }
        }
      }
    }
  }
  return null
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
  it("keeps the reference solution valid and blanks up to the requested cells", () => {
    const { puzzle, solution, givens } = generatePuzzle(123, 45)
    expect(unitsAreComplete(solution)).toBe(true)
    expect(puzzle).toHaveLength(CELLS)
    // Every clue matches the solution; blanks are 0.
    for (let i = 0; i < CELLS; i += 1) {
      if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i])
      expect(givens[i]).toBe(puzzle[i] !== 0)
    }
    // A blank is kept only while the board stays unambiguous, so the count is
    // a ceiling rather than a guarantee.
    expect(puzzle.filter((v) => v === 0).length).toBeLessThanOrEqual(45)
  })

  it("is deterministic per seed", () => {
    expect(generatePuzzle(500, 40)).toEqual(generatePuzzle(500, 40))
  })

  // The bug this guards against: with holes punched at random, every "difícil"
  // board measured had more than one valid completion, so a player could fill
  // the grid correctly and never be told they had won.
  it("produces puzzles with exactly one solution at every difficulty", () => {
    for (const level of DIFFICULTIES) {
      for (const seed of [1, 2, 3, 4, 5]) {
        const { puzzle } = generatePuzzle(seed * 7919, level.holes)
        expect(hasUniqueSolution(puzzle)).toBe(true)
      }
    }
  })

  it("reaches the requested number of blanks in practice", () => {
    for (const level of DIFFICULTIES) {
      const { puzzle } = generatePuzzle(4242, level.holes)
      expect(puzzle.filter((v) => v === 0)).toHaveLength(level.holes)
    }
  })
})

describe("countSolutions", () => {
  it("counts a completed board as one solution", () => {
    expect(countSolutions(scrambledSolution(5))).toBe(1)
  })

  it("stops at the cap instead of enumerating everything", () => {
    // An empty board has billions of solutions; the cap is what keeps this
    // from running forever.
    expect(countSolutions(new Array(CELLS).fill(0), 2)).toBe(2)
  })

  // Without the up-front conflict check the search has to prove a negative by
  // exhaustion: this board did not finish in 60 seconds.
  it("rejects an already-contradictory board immediately", () => {
    const grid: Grid = new Array(CELLS).fill(0)
    grid[0] = 5
    grid[1] = 5 // duplicate in the same row
    const started = Date.now()
    expect(countSolutions(grid)).toBe(0)
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it("leaves the grid it was given unchanged", () => {
    const { puzzle } = generatePuzzle(31, 40)
    const before = [...puzzle]
    countSolutions(puzzle)
    expect(puzzle).toEqual(before)
  })

  it("finds two solutions when a swappable pair is blanked", () => {
    for (const seed of [8, 42, 123]) {
      const solution = scrambledSolution(seed)
      const rectangle = findSwappableRectangle(solution)
      expect(rectangle).not.toBeNull()
      const grid = [...solution]
      for (const index of rectangle as number[]) grid[index] = 0
      expect(countSolutions(grid)).toBe(2)
    }
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

  it("isComplete rejects a full board that breaks the rules", () => {
    const grid: Grid = new Array(CELLS).fill(1)
    expect(isComplete(grid)).toBe(false)
  })

  it("isComplete rejects a grid of the wrong size", () => {
    expect(isComplete(new Array(CELLS - 1).fill(1))).toBe(false)
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

  it("holesFor matches the presets", () => {
    for (const level of DIFFICULTIES) {
      expect(holesFor(level.id)).toBe(level.holes)
    }
  })
})
