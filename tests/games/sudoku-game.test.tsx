// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { SIZE, generatePuzzle, scrambledSolution, type Puzzle } from "@/lib/games/sudoku"
import { SudokuGame } from "@/components/games/sudoku-game"

// The generator is replaced so each case can start from an exactly known board.
// Everything else — the win condition, conflict marking, keyboard movement —
// is the real component. vi.mock is hoisted above these imports.
vi.mock("@/lib/games/sudoku", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/games/sudoku")>()
  return { ...actual, generatePuzzle: vi.fn() }
})

const mockedGenerate = vi.mocked(generatePuzzle)

function boardFrom(solution: number[], blanks: number[]): Puzzle {
  const puzzle = [...solution]
  for (const index of blanks) puzzle[index] = 0
  return { puzzle, solution, givens: puzzle.map((value) => value !== 0) }
}

// Fills a cell by selecting it and pressing a digit on the on-screen pad.
function fill(index: number, value: number) {
  const row = Math.floor(index / SIZE) + 1
  const col = (index % SIZE) + 1
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^Linha ${row}, coluna ${col},`) }))
  fireEvent.click(screen.getByRole("button", { name: String(value) }))
}

afterEach(() => {
  cleanup()
  mockedGenerate.mockReset()
})

describe("SudokuGame", () => {
  it("accepts a valid solution that differs from the generated one", () => {
    // Seed 8 has a swappable rectangle at 3/6/12/15: two rows in the same band
    // and two columns in different stacks holding the same two digits
    // crosswise. Blanking all four leaves two valid completions.
    const solution = scrambledSolution(8)
    const rectangle = [3, 6, 12, 15]
    const a = solution[3]
    const b = solution[6]
    expect(solution[12]).toBe(b)
    expect(solution[15]).toBe(a)

    mockedGenerate.mockReturnValue(boardFrom(solution, rectangle))
    render(<SudokuGame />)

    // Fill with the *other* completion — the pair swapped.
    fill(3, b)
    fill(6, a)
    fill(12, a)
    fill(15, b)

    // The board is complete and breaks no rule, so it is solved. Comparing
    // against the stored solution would have refused this for ever.
    expect(screen.getByText(/Resolvido em/)).toBeTruthy()
  })

  it("does not declare a win while the board still breaks a rule", () => {
    const solution = scrambledSolution(8)
    mockedGenerate.mockReturnValue(boardFrom(solution, [3, 6, 12, 15]))
    render(<SudokuGame />)

    const wrong = solution[3] === 1 ? 2 : 1
    fill(3, wrong)
    fill(6, wrong)
    fill(12, wrong)
    fill(15, wrong)

    expect(screen.queryByText(/Resolvido em/)).toBeNull()
  })

  it("counts down the remaining cells as they are filled", () => {
    const solution = scrambledSolution(8)
    mockedGenerate.mockReturnValue(boardFrom(solution, [3, 6, 12, 15]))
    render(<SudokuGame />)

    expect(screen.getByText("4 células restantes")).toBeTruthy()
    fill(3, solution[3])
    expect(screen.getByText("3 células restantes")).toBeTruthy()
  })

  // Conflicts were shown in red only, which is invisible to a reader who
  // cannot distinguish it — and to a screen reader.
  it("announces a conflict rather than only colouring it", () => {
    const solution = scrambledSolution(8)
    mockedGenerate.mockReturnValue(boardFrom(solution, [3, 6, 12, 15]))
    render(<SudokuGame />)

    // Repeat a digit that already sits in the same row.
    fill(3, solution[0])
    expect(screen.getAllByRole("button", { name: /em conflito/ }).length).toBeGreaterThan(1)
  })

  it("keeps arrow keys inside the board instead of wrapping to the next row", () => {
    const solution = scrambledSolution(8)
    mockedGenerate.mockReturnValue(boardFrom(solution, [3, 6, 12, 15]))
    const { container } = render(<SudokuGame />)
    const board = container.querySelector('[aria-label="Grade do Sudoku"]') as HTMLElement

    // Select the first cell of the second row, then press Left. jsdom does not
    // focus on click the way a browser does, so focus is set explicitly here.
    const firstOfSecondRow = screen.getByRole("button", { name: /^Linha 2, coluna 1,/ })
    fireEvent.click(firstOfSecondRow)
    firstOfSecondRow.focus()
    fireEvent.keyDown(board, { key: "ArrowLeft" })

    // It must stay put; stepping the flat index would land on row 1, column 9.
    expect(document.activeElement).toBe(firstOfSecondRow)
  })

  it("moves focus with the selection so the new cell is announced", () => {
    const solution = scrambledSolution(8)
    mockedGenerate.mockReturnValue(boardFrom(solution, [3, 6, 12, 15]))
    const { container } = render(<SudokuGame />)
    const board = container.querySelector('[aria-label="Grade do Sudoku"]') as HTMLElement

    fireEvent.click(screen.getByRole("button", { name: /^Linha 1, coluna 1,/ }))
    fireEvent.keyDown(board, { key: "ArrowRight" })

    expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Linha 1, coluna 2,/ }))
  })
})
