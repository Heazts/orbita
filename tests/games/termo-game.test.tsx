// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { TermoGame } from "@/components/games/termo-game"
import { dailyAnswer } from "@/lib/games/termo"

// Types a whole word on the on-screen keyboard and submits it.
function play(word: string) {
  for (const letter of word) {
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${letter}(,|$)`) }))
  }
  fireEvent.click(screen.getByRole("button", { name: "Enviar palavra" }))
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

describe("TermoGame", () => {
  // Green and amber are the classic confusion pair, so the result cannot be
  // carried by the fill colour alone.
  it("states each letter's result in words, not only in colour", () => {
    const answer = dailyAnswer()
    render(<TermoGame />)
    play(answer)

    // Every letter of a winning guess is correct, and says so.
    expect(screen.getAllByLabelText(new RegExp(`^${answer[0]}, correta$`)).length).toBeGreaterThan(0)
    expect(screen.getByText("Acertou! 🎉")).toBeTruthy()
  })

  it("distinguishes a misplaced letter from a correct one in text", () => {
    const answer = dailyAnswer()
    // Rotate the answer so its letters are present but almost all misplaced.
    const shuffled = answer.slice(1) + answer[0]
    render(<TermoGame />)
    play(shuffled)

    const misplaced = screen.queryAllByLabelText(/, na palavra, em outra posição$/)
    expect(misplaced.length).toBeGreaterThan(0)
  })

  it("explains the marker it uses instead of relying on colour", () => {
    render(<TermoGame />)
    expect(screen.getByText("Letra na palavra, em outra posição")).toBeTruthy()
    expect(screen.getByText("Letra correta")).toBeTruthy()
    expect(screen.getByText("Letra ausente")).toBeTruthy()
  })

  it("rejects a guess that is not five letters", () => {
    render(<TermoGame />)
    fireEvent.click(screen.getByRole("button", { name: /^A(,|$)/ }))
    fireEvent.click(screen.getByRole("button", { name: "Enviar palavra" }))
    expect(screen.getByText("Digite uma palavra de 5 letras.")).toBeTruthy()
  })

  it("keeps the daily and free modes on separate tabs", () => {
    render(<TermoGame />)
    const daily = screen.getByRole("tab", { name: /Palavra do dia/ })
    const free = screen.getByRole("tab", { name: /Modo livre/ })
    expect(daily.getAttribute("aria-selected")).toBe("true")

    fireEvent.click(free)
    expect(free.getAttribute("aria-selected")).toBe("true")
    expect(daily.getAttribute("aria-selected")).toBe("false")
  })

  // Progress is keyed by day, so a saved game from another day must not be
  // replayed against today's word.
  it("restores today's guesses and ignores another day's", () => {
    const answer = dailyAnswer()
    render(<TermoGame />)
    play(answer)
    cleanup()

    render(<TermoGame />)
    expect(screen.getByText("Acertou! 🎉")).toBeTruthy()
    cleanup()

    const saved = JSON.parse(window.localStorage.getItem("orbita-termo-daily") ?? "{}")
    window.localStorage.setItem(
      "orbita-termo-daily",
      JSON.stringify({ ...saved, day: saved.day - 1 }),
    )
    render(<TermoGame />)
    expect(screen.queryByText("Acertou! 🎉")).toBeNull()
  })

  it("does not count the same daily game twice across reloads", () => {
    const answer = dailyAnswer()
    render(<TermoGame />)
    play(answer)
    const first = JSON.parse(window.localStorage.getItem("orbita-termo-stats") ?? "{}")
    expect(first.played).toBe(1)
    cleanup()

    render(<TermoGame />)
    const second = JSON.parse(window.localStorage.getItem("orbita-termo-stats") ?? "{}")
    expect(second.played).toBe(1)
  })
})

describe("TermoGame statistics", () => {
  it("records the day so a streak can tell a gap from a run", () => {
    const answer = dailyAnswer()
    render(<TermoGame />)
    play(answer)

    const stats = JSON.parse(window.localStorage.getItem("orbita-termo-stats") ?? "{}")
    expect(stats.currentStreak).toBe(1)
    expect(typeof stats.lastDay).toBe("number")
  })
})
