import { describe, expect, it } from "vitest"
import type { LetterResult } from "@/lib/games/termo"
import { EMPTY_STATS, isTermoStats, recordResult, shareText, winRate } from "@/lib/games/termo-stats"

describe("isTermoStats", () => {
  it("accepts the empty stats", () => {
    expect(isTermoStats(EMPTY_STATS)).toBe(true)
  })

  // Stats persisted before lastDay existed must keep validating, or every
  // player's history is silently discarded on the next visit.
  it("accepts stats saved without lastDay", () => {
    expect(isTermoStats({ ...EMPTY_STATS, lastDay: undefined })).toBe(true)
  })

  it("accepts a valid lastDay and rejects a bad one", () => {
    expect(isTermoStats({ ...EMPTY_STATS, lastDay: 20_000 })).toBe(true)
    expect(isTermoStats({ ...EMPTY_STATS, lastDay: -1 })).toBe(false)
    expect(isTermoStats({ ...EMPTY_STATS, lastDay: "ontem" })).toBe(false)
  })

  it("rejects values that would break recordResult", () => {
    expect(isTermoStats(null)).toBe(false)
    expect(isTermoStats("{}")).toBe(false)
    expect(isTermoStats({ ...EMPTY_STATS, distribution: "nope" })).toBe(false)
    expect(isTermoStats({ ...EMPTY_STATS, distribution: [1, 2, 3] })).toBe(false)
    expect(isTermoStats({ ...EMPTY_STATS, played: -2 })).toBe(false)
  })
})

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

  it("ignores an attempt count outside the distribution", () => {
    expect(recordResult(EMPTY_STATS, true, 0).distribution).toEqual(EMPTY_STATS.distribution)
    expect(recordResult(EMPTY_STATS, true, 7).distribution).toEqual(EMPTY_STATS.distribution)
  })
})

// The counter is labelled "Sequência" in the UI and documented as consecutive
// daily wins, but it used to survive any gap: winning once a month showed a
// streak climbing to 12.
describe("recordResult streaks across days", () => {
  it("extends the streak on the very next day", () => {
    let stats = recordResult(EMPTY_STATS, true, 3, 20_000)
    stats = recordResult(stats, true, 4, 20_001)
    stats = recordResult(stats, true, 2, 20_002)
    expect(stats.currentStreak).toBe(3)
    expect(stats.bestStreak).toBe(3)
    expect(stats.lastDay).toBe(20_002)
  })

  it("restarts the streak at one after a skipped day", () => {
    let stats = recordResult(EMPTY_STATS, true, 3, 20_000)
    stats = recordResult(stats, true, 3, 20_001)
    expect(stats.currentStreak).toBe(2)

    stats = recordResult(stats, true, 3, 20_005)
    expect(stats.currentStreak).toBe(1)
    // The best streak is a record, so the gap does not erase it.
    expect(stats.bestStreak).toBe(2)
  })

  it("still resets to zero on a loss", () => {
    let stats = recordResult(EMPTY_STATS, true, 3, 20_000)
    stats = recordResult(stats, false, 6, 20_001)
    expect(stats.currentStreak).toBe(0)
    expect(stats.lastDay).toBe(20_001)
  })

  it("restarts after a gap that follows a loss", () => {
    let stats = recordResult(EMPTY_STATS, false, 6, 20_000)
    stats = recordResult(stats, true, 3, 20_010)
    expect(stats.currentStreak).toBe(1)
  })

  // Stats saved before lastDay existed have no previous day to compare with.
  // Continuing the streak matches what those stats already recorded.
  it("continues the streak when the previous day is unknown", () => {
    const legacy = { ...EMPTY_STATS, played: 4, wins: 4, currentStreak: 4, bestStreak: 4 }
    const stats = recordResult(legacy, true, 3, 20_000)
    expect(stats.currentStreak).toBe(5)
    expect(stats.lastDay).toBe(20_000)
  })

  it("leaves lastDay unset when no day is given", () => {
    const stats = recordResult(EMPTY_STATS, true, 3)
    expect(stats.lastDay).toBeUndefined()
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
