import { describe, expect, it } from "vitest"
import { brasiliaDay } from "@/lib/day"

// The bug this replaces: counting UTC days meant the daily games turned over at
// 21:00 in Brazil. Someone playing at 22:00 on a Monday was handed Tuesday's
// word, while the page still said to come back tomorrow.
describe("brasiliaDay", () => {
  it("keeps the whole Brazilian day on one index", () => {
    const morning = brasiliaDay(new Date("2026-07-24T03:00:00-03:00"))
    const evening = brasiliaDay(new Date("2026-07-24T23:59:00-03:00"))
    expect(evening).toBe(morning)
  })

  it("rolls over at local midnight, not at 21:00", () => {
    // 23:00 on the 24th in Brasília is already the 25th in UTC.
    const lateNight = new Date("2026-07-24T23:00:00-03:00")
    expect(lateNight.getUTCDate()).toBe(25)
    expect(brasiliaDay(lateNight)).toBe(brasiliaDay(new Date("2026-07-24T09:00:00-03:00")))
  })

  it("advances by exactly one per calendar day", () => {
    const first = brasiliaDay(new Date("2026-07-24T12:00:00-03:00"))
    const second = brasiliaDay(new Date("2026-07-25T12:00:00-03:00"))
    expect(second - first).toBe(1)
  })

  it("counts consecutive days across a month boundary", () => {
    const last = brasiliaDay(new Date("2026-07-31T12:00:00-03:00"))
    const next = brasiliaDay(new Date("2026-08-01T12:00:00-03:00"))
    expect(next - last).toBe(1)
  })

  it("counts consecutive days across a year boundary", () => {
    const last = brasiliaDay(new Date("2026-12-31T12:00:00-03:00"))
    const next = brasiliaDay(new Date("2027-01-01T12:00:00-03:00"))
    expect(next - last).toBe(1)
  })

  it("is a whole number", () => {
    expect(Number.isInteger(brasiliaDay(new Date("2026-07-24T12:00:00Z")))).toBe(true)
  })
})
