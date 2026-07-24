import { describe, expect, it } from "vitest"
import type { LetterResult } from "@/lib/games/termo"
import { EMPTY_STATS, recordResult, shareText, winRate } from "@/lib/games/termo-stats"

describe("recordResult", () => {
  it("counts a win with its attempt distribution and starts a streak", () => {
    const stats = recordResult(EMPTY_STATS, true, 3)
    expect(stats.played).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.currentStreak).toBe(1)
    expect(stats.bestStreak).toBe(1)
    expect(stats.distribution).toEqual([0, 0, 1, 0, 0, 0])
  })

  it("a loss resets the streak but keeps the best streak", () => {
    let stats = EMPTY_STATS
    stats = recordResult(stats, true, 2)
    stats = recordResult(stats, true, 4)
    expect(stats.currentStreak).toBe(2)
    stats = recordResult(stats, false, 6)
    expect(stats.played).toBe(3)
    expect(stats.wins).toBe(2)
    expect(stats.currentStreak).toBe(0)
    expect(stats.bestStreak).toBe(2)
    // Losses never enter the distribution.
    expect(stats.distribution).toEqual([0, 1, 0, 1, 0, 0])
  })

  it("does not mutate the input stats", () => {
    const before = { ...EMPTY_STATS, distribution: [...EMPTY_STATS.distribution] }
    recordResult(before, true, 1)
    expect(before).toEqual(EMPTY_STATS)
  })
})

describe("winRate", () => {
  it("is 0 with no games and rounds to a whole percent", () => {
    expect(winRate(EMPTY_STATS)).toBe(0)
    let stats = recordResult(EMPTY_STATS, true, 1)
    stats = recordResult(stats, true, 1)
    stats = recordResult(stats, false, 6)
    expect(winRate(stats)).toBe(67)
  })
})

describe("shareText", () => {
  const row = (letters: LetterResult[]): LetterResult[] => letters

  it("builds the emoji grid with the score, without revealing letters", () => {
    const attempts = [
      row(["absent", "present", "absent", "correct", "absent"]),
      row(["correct", "correct", "correct", "correct", "correct"]),
    ]
    const text = shareText("Termo Órbita", attempts, true, 6)
    expect(text).toBe("Termo Órbita 2/6\n\n⬛🟨⬛🟩⬛\n🟩🟩🟩🟩🟩")
  })

  it("uses X as the score on a loss", () => {
    const attempts = [row(["absent", "absent", "absent", "absent", "absent"])]
    expect(shareText("Termo Órbita", attempts, false, 6)).toContain("X/6")
  })
})
