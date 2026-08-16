import { describe, expect, it } from "vitest"
import { plainText, truncate } from "@/lib/news"
import { findImage } from "@/lib/parse"

// Regression guard for polynomial backtracking on feed text.
//
// plainText and truncate run over RSS descriptions, which are third-party
// input bounded only by the 5 MB feed cap in lib/aggregate.ts. Both used a
// /[...]+$/-shaped pattern with no left anchor, so the engine restarted the
// match at every offset and rescanned the same trailing run each time —
// quadratic. plainText took ~11.8 s on an 80 000-character run and stalled the
// event loop for every concurrent request.
//
// The budgets below are deliberately loose: the point is to separate linear
// from quadratic, not to benchmark. At the sizes used here the old code needed
// tens of seconds to minutes, so a regression blows past these by orders of
// magnitude and cannot pass by being merely slow on a loaded CI runner.
const BUDGET_MS = 2_000

function elapsed(fn: () => void): number {
  const started = process.hrtime.bigint()
  fn()
  return Number(process.hrtime.bigint() - started) / 1e6
}

describe("plainText resists polynomial backtracking", () => {
  it("handles a long whitespace run after a boilerplate phrase", () => {
    // The original worst case: BOILERPLATE_REGEX begins and ends with a
    // variable-width \s run anchored to $.
    const input = `Manchete leia mais${" ".repeat(200_000)}x`
    expect(elapsed(() => plainText(input))).toBeLessThan(BUDGET_MS)
  })

  it("handles a long trailing whitespace run with no boilerplate", () => {
    const input = `Manchete${" ".repeat(200_000)}`
    expect(elapsed(() => plainText(input))).toBeLessThan(BUDGET_MS)
  })

  it("handles a long trailing punctuation run", () => {
    const input = `Manchete ${".".repeat(200_000)}`
    expect(elapsed(() => plainText(input))).toBeLessThan(BUDGET_MS)
  })

  it("handles interleaved whitespace and punctuation", () => {
    const input = `Manchete ${" .".repeat(100_000)}`
    expect(elapsed(() => plainText(input))).toBeLessThan(BUDGET_MS)
  })

  it("scales sub-quadratically as the run grows", () => {
    const build = (n: number) => `Manchete leia mais${" ".repeat(n)}x`
    // Warm up so JIT compilation is not attributed to the larger input.
    plainText(build(1_000))
    const small = Math.max(elapsed(() => plainText(build(50_000))), 0.05)
    const large = elapsed(() => plainText(build(200_000)))
    // Quadratic would be ~16x for 4x the input. Linear is ~4x. Allow 8x of
    // headroom for timer noise while still failing on quadratic growth.
    expect(large / small).toBeLessThan(8)
  })
})

describe("truncate resists polynomial backtracking", () => {
  it("handles a long trailing punctuation run", () => {
    const input = `Manchete ${".".repeat(200_000)}x`
    expect(elapsed(() => truncate(input, 220))).toBeLessThan(BUDGET_MS)
  })
})

describe("findImage scans malformed tags in linear time", () => {
  it("handles many incomplete img prefixes within the budget", () => {
    const input = `${"<img ".repeat(40_000)}x`
    expect(elapsed(() => findImage({ description: input }))).toBeLessThan(BUDGET_MS)
    expect(findImage({ description: input })).toBeNull()
  })

  it("scales sub-quadratically and still finds quoted src attributes", () => {
    const build = (count: number) => `${"texto ".repeat(count)}<IMG alt='x' SRC = "https://cdn.site.com/photo.jpg">`
    findImage({ description: build(1_000) })
    const small = Math.max(elapsed(() => findImage({ description: build(20_000) })), 0.05)
    const large = elapsed(() => findImage({ description: build(80_000) }))
    expect(large / small).toBeLessThan(8)
    expect(findImage({ description: build(1) })).toBe("https://cdn.site.com/photo.jpg")
  })
})

// The fix reordered the whitespace collapse ahead of BOILERPLATE_REGEX and
// replaced truncate's regex trim with a backwards scan. Neither may change
// what the functions actually produce.
describe("output is unchanged by the linearization", () => {
  it.each([
    ["Manchete leia mais", "Manchete"],
    ["Manchete   leia   mais", "Manchete"],
    ["Manchete leia mais   ", "Manchete"],
    ["Manchete clique aqui", "Manchete"],
    ["Manchete saiba mais.", "Manchete"],
    ["Manchete...", "Manchete"],
    ["Notícia sem boilerplate", "Notícia sem boilerplate"],
    ["  espaços   colapsados  ", "espaços colapsados"],
  ])("plainText(%j) === %j", (input, expected) => {
    expect(plainText(input)).toBe(expected)
  })

  it("still strips trailing punctuation before the ellipsis", () => {
    expect(truncate("Uma frase sem final", 220)).toBe("Uma frase sem final…")
    expect(truncate("Uma frase com vírgula,", 220)).toBe("Uma frase com vírgula…")
    expect(truncate("Uma frase com travessão —", 220)).toBe("Uma frase com travessão…")
    expect(truncate("Uma frase terminada.", 220)).toBe("Uma frase terminada.")
  })

  it("still cuts on a word boundary when clipping", () => {
    const long = `${"palavra ".repeat(60)}fim`
    const result = truncate(long, 220)
    expect(result.length).toBeLessThanOrEqual(221)
    expect(result.endsWith("…")).toBe(true)
    expect(result).not.toContain("  ")
  })
})
