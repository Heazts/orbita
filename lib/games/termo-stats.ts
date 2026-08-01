// Pure helpers for Termo statistics and the shareable result grid. Kept free of
// React/storage so they can be unit-tested in isolation; persistence lives in
// the component via useHydratedState.

import type { LetterResult } from "@/lib/games/termo"
import { isCount, isPlainObject } from "@/lib/guards"

export type TermoStats = {
  played: number
  wins: number
  // Wins on consecutive days. A loss resets it to zero, and so does a skipped
  // day — the counter used to survive any gap, so winning once a month showed
  // as a growing streak.
  currentStreak: number
  bestStreak: number
  // distribution[i] = games won in i+1 attempts.
  distribution: number[]
  // Day index (see lib/day) of the last daily game folded in, used to tell a
  // continued streak from a resumed one. Optional so stats saved before this
  // field existed still validate instead of being discarded.
  lastDay?: number
}

export const EMPTY_STATS: TermoStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  distribution: [0, 0, 0, 0, 0, 0],
}

// Validates stats restored from localStorage. Without this, a corrupted or
// stale-schema value reaches recordResult, where `[...stats.distribution]`
// throws on a non-iterable and silently yields NaN counters on a string.
export function isTermoStats(value: unknown): value is TermoStats {
  if (!isPlainObject(value)) return false
  return (
    isCount(value.played) &&
    isCount(value.wins) &&
    isCount(value.currentStreak) &&
    isCount(value.bestStreak) &&
    (value.lastDay === undefined || isCount(value.lastDay)) &&
    Array.isArray(value.distribution) &&
    value.distribution.length === EMPTY_STATS.distribution.length &&
    value.distribution.every(isCount)
  )
}

// Folds one finished game into the stats. Pure: returns a new object.
//
// `day` is the day index the game belongs to (see lib/day). It is optional
// because stats saved before the field existed have no previous day to compare
// against; without it the streak simply continues, which is what the old
// behaviour did in every case.
export function recordResult(
  stats: TermoStats,
  won: boolean,
  attempts: number,
  day?: number,
): TermoStats {
  const distribution = [...stats.distribution]
  if (won && attempts >= 1 && attempts <= distribution.length) {
    distribution[attempts - 1] += 1
  }

  // A streak continues only into the very next day. Anything else — a gap, or
  // stats carried over from before this field existed with no way to tell —
  // starts a new streak at one.
  const continues =
    stats.lastDay === undefined || day === undefined || day === stats.lastDay + 1
  const currentStreak = won ? (continues ? stats.currentStreak + 1 : 1) : 0

  return {
    played: stats.played + 1,
    wins: stats.wins + (won ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    distribution,
    ...(day === undefined ? {} : { lastDay: day }),
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
