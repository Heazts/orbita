import { describe, expect, it } from "vitest"
import {
  ANSWERS,
  WORD_LENGTH,
  dailyAnswer,
  evaluateGuess,
  isValidGuess,
  isWin,
  keyboardHints,
  normalizeGuess,
} from "@/lib/games/termo"

describe("normalizeGuess", () => {
  it("strips accents, uppercases and keeps only A–Z", () => {
    expect(normalizeGuess("praça")).toBe("PRACA")
    expect(normalizeGuess(" Eleição ")).toBe("ELEICAO")
  })
})

describe("isValidGuess", () => {
  it("accepts exactly five letters, ignoring accents/case", () => {
    expect(isValidGuess("praia")).toBe(true)
    expect(isValidGuess("praça")).toBe(true)
    expect(isValidGuess("casa")).toBe(false)
    expect(isValidGuess("palavra")).toBe(false)
  })
})

describe("evaluateGuess", () => {
  it("marks every letter correct when the guess equals the answer", () => {
    expect(evaluateGuess("PRATO", "PRATO")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ])
  })

  it("distinguishes correct, present and absent", () => {
    // answer PRATO, guess PORTA
    expect(evaluateGuess("PORTA", "PRATO")).toEqual([
      "correct", "present", "present", "correct", "present",
    ])
  })

  it("handles a repeated guess letter against a single answer letter", () => {
    // PRATO has one A; only the matched A counts, the rest are absent.
    expect(evaluateGuess("AAAAA", "PRATO")).toEqual([
      "absent", "absent", "correct", "absent", "absent",
    ])
  })

  it("gives 'present' for a duplicate only while the answer still has copies", () => {
    // TERRA has two R's; guess RURAL: one R correct (pos 2), one R present.
    expect(evaluateGuess("RURAL", "TERRA")).toEqual([
      "present", "absent", "correct", "present", "absent",
    ])
  })

  it("ignores accents in the guess", () => {
    // "práia" (with accent) is normalized to PRAIA and matches exactly.
    expect(evaluateGuess("práia", "PRAIA")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ])
    expect(evaluateGuess("praia", "PRAIA")).toEqual([
      "correct", "correct", "correct", "correct", "correct",
    ])
  })
})

describe("isWin", () => {
  it("is true only when all letters are correct", () => {
    expect(isWin(["correct", "correct", "correct", "correct", "correct"])).toBe(true)
    expect(isWin(["correct", "correct", "present", "correct", "correct"])).toBe(false)
    expect(isWin([])).toBe(false)
  })
})

describe("dailyAnswer", () => {
  it("is deterministic per day and always a listed answer", () => {
    const day = new Date("2026-07-24T12:00:00Z")
    const a = dailyAnswer(day)
    expect(a).toBe(dailyAnswer(new Date("2026-07-24T23:00:00Z")))
    expect(ANSWERS).toContain(a)
    expect(a.length).toBe(WORD_LENGTH)
  })

  it("changes across days", () => {
    const answers = new Set(
      Array.from({ length: ANSWERS.length }, (_, i) =>
        dailyAnswer(new Date(Date.UTC(2026, 0, 1 + i))),
      ),
    )
    // Over a full cycle we should see many distinct answers, not a stuck value.
    expect(answers.size).toBeGreaterThan(1)
  })
})

describe("keyboardHints", () => {
  it("keeps the best result seen per letter", () => {
    const hints = keyboardHints([
      { guess: "PORTA", results: evaluateGuess("PORTA", "PRATO") },
    ])
    expect(hints.P).toBe("correct")
    expect(hints.O).toBe("present")
    // T is correct at position 3 in this guess.
    expect(hints.T).toBe("correct")
  })
})
