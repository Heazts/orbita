// Pure helpers for Termo statistics and the shareable result grid. Kept free of
// React/storage so they can be unit-tested in isolation; persistence lives in
// the component via useHydratedState.

import type { LetterResult } from "@/lib/games/termo"

export type TermoStats = {
  played: number
  wins: number
  // Consecutive daily wins; a loss resets it to zero.
  currentStreak: number
  bestStreak: number
  // distribution[i] = games won in i+1 attempts.
  distribution: number[]
}

export const EMPTY_STATS: TermoStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0],
}

// Folds one finished game into the stats. Pure: returns a new object.
export function recordResult(stats: TermoStats, won: boolean, attempts: number): TermoStats {
  const distribution = [...stats.distribution]
  if (won && attempts >= 1 && attempts <= distribution.length) {
    distribution[attempts - 1] += 1
  }
  const currentStreak = won ? stats.currentStreak + 1 : 0
  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    distribution,
  }
}

export function winRate(stats: TermoStats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100)
}

const RESULT_EMOJI: Record<LetterResult, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
}

// The classic shareable summary: title, score ("3/6" or "X/6") and the emoji
// grid of every attempt — no letters, so it never spoils the word.
export function shareText(
  title: string,
  attempts: LetterResult[][],
  won: boolean,
  maxAttempts: number,
): string {
  const score = won ? String(attempts.length) : "X"
  const grid = attempts
    .map((row) => row.map((result) => RESULT_EMOJI[result]).join(""))
    .join("\n")
  return `${title} ${score}/${maxAttempts}\n\n${grid}`
}
