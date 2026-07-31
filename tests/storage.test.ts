// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { isCount, isPlainObject, isStringArray } from "@/lib/guards"
import { readStore, writeStore } from "@/lib/storage"
import { EMPTY_STATS, isTermoStats, recordResult } from "@/lib/games/termo-stats"

beforeEach(() => {
  localStorage.clear()
})

describe("readStore", () => {
  it("returns the fallback when the key is absent", () => {
    expect(readStore("missing", { a: 1 })).toEqual({ a: 1 })
  })

  it("returns the fallback when the stored value is not JSON", () => {
    localStorage.setItem("k", "{not json")
    expect(readStore("k", [])).toEqual([])
  })

  it("round-trips a value written by writeStore", () => {
    writeStore("k", { tone: "all" })
    expect(readStore("k", { tone: "balanced" })).toEqual({ tone: "all" })
  })

  // The old `typeof parsed === typeof fallback` check passed both of these,
  // because typeof [] and typeof {} are each "object".
  it("rejects an array stored under an object fallback", () => {
    localStorage.setItem("k", JSON.stringify(["a", "b"]))
    expect(readStore<Record<string, string>>("k", {})).toEqual({})
  })

  it("rejects an object stored under an array fallback", () => {
    localStorage.setItem("k", JSON.stringify({ 0: "a" }))
    expect(readStore<string[]>("k", [])).toEqual([])
  })

  it("rejects null stored under an object fallback", () => {
    localStorage.setItem("k", "null")
    expect(readStore<Record<string, string>>("k", {})).toEqual({})
  })

  it("rejects a primitive stored under an object fallback", () => {
    localStorage.setItem("k", "42")
    expect(readStore<Record<string, string>>("k", {})).toEqual({})
  })

  it("defers to a caller-supplied guard over the shape check", () => {
    localStorage.setItem("k", JSON.stringify(["a", 1]))
    expect(readStore<string[]>("k", [], isStringArray)).toEqual([])

    localStorage.setItem("k", JSON.stringify(["a", "b"]))
    expect(readStore<string[]>("k", [], isStringArray)).toEqual(["a", "b"])
  })
})

describe("guards", () => {
  it("isPlainObject accepts only non-null, non-array objects", () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject("x")).toBe(false)
  })

  it("isStringArray requires every entry to be a string", () => {
    expect(isStringArray([])).toBe(true)
    expect(isStringArray(["a"])).toBe(true)
    expect(isStringArray(["a", 1])).toBe(false)
    expect(isStringArray("ab")).toBe(false)
  })

  it("isCount rejects negatives, fractions and non-finite numbers", () => {
    expect(isCount(0)).toBe(true)
    expect(isCount(7)).toBe(true)
    expect(isCount(-1)).toBe(false)
    expect(isCount(1.5)).toBe(false)
    expect(isCount(NaN)).toBe(false)
    expect(isCount(Infinity)).toBe(false)
    expect(isCount("3")).toBe(false)
  })
})

describe("isTermoStats", () => {
  it("accepts the empty stats object", () => {
    expect(isTermoStats(EMPTY_STATS)).toBe(true)
  })

  it.each([
    ["a non-object", 5],
    ["a missing counter", { wins: 0, currentStreak: 0, bestStreak: 0, distribution: [0, 0, 0, 0, 0, 0] }],
    ["a string distribution", { ...EMPTY_STATS, distribution: "000000" }],
    ["a numeric distribution", { ...EMPTY_STATS, distribution: 6 }],
    ["a short distribution", { ...EMPTY_STATS, distribution: [0, 0] }],
    ["a distribution of non-counts", { ...EMPTY_STATS, distribution: [0, 0, 0, 0, 0, "x"] }],
    ["a negative counter", { ...EMPTY_STATS, played: -1 }],
  ])("rejects %s", (_label, value) => {
    expect(isTermoStats(value)).toBe(false)
  })

  // Without the guard these reached recordResult, where a numeric distribution
  // throws on spread and a string one silently produces NaN counters.
  it("keeps recordResult safe for every value it admits", () => {
    const restored = readStore("orbita-termo-stats", EMPTY_STATS, isTermoStats)
    expect(() => recordResult(restored, true, 3)).not.toThrow()
  })

  it("falls back to EMPTY_STATS when storage holds a corrupted distribution", () => {
    localStorage.setItem("orbita-termo-stats", JSON.stringify({ ...EMPTY_STATS, distribution: 6 }))
    const restored = readStore("orbita-termo-stats", EMPTY_STATS, isTermoStats)
    expect(restored).toEqual(EMPTY_STATS)
    expect(recordResult(restored, true, 3).distribution).toEqual([0, 0, 1, 0, 0, 0])
  })
})
