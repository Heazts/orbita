import { afterEach, describe, expect, it } from "vitest"
import {
  IMAGE_RATE_LIMIT,
  NEWS_RATE_LIMIT,
  REPORT_RATE_LIMIT,
  RATE_LIMIT_MAX_REQUESTS,
  checkRateLimit,
  resetRateLimit,
} from "@/lib/rate-limit"

afterEach(() => resetRateLimit())

/**
 * The image proxy has to have its own budget.
 *
 * Measured in Chromium against the production build: opening the home page
 * requests 6 images, and scrolling the whole list requests 100 — one per card.
 * A shared 30/minute counter would have left a reader looking at broken
 * thumbnails a third of the way down the page.
 */
describe("separate budgets per route", () => {
  const now = 1_000_000

  it("spending the news budget does not touch the image budget", () => {
    for (let i = 0; i < NEWS_RATE_LIMIT.max + 5; i += 1) checkRateLimit("1.2.3.4", now, NEWS_RATE_LIMIT)
    expect(checkRateLimit("1.2.3.4", now, NEWS_RATE_LIMIT).limited).toBe(true)

    // Same address, different route: untouched.
    expect(checkRateLimit("1.2.3.4", now, IMAGE_RATE_LIMIT).limited).toBe(false)
  })

  it("spending the image budget does not touch the news budget", () => {
    for (let i = 0; i < IMAGE_RATE_LIMIT.max + 5; i += 1) checkRateLimit("1.2.3.4", now, IMAGE_RATE_LIMIT)
    expect(checkRateLimit("1.2.3.4", now, IMAGE_RATE_LIMIT).limited).toBe(true)
    expect(checkRateLimit("1.2.3.4", now, NEWS_RATE_LIMIT).limited).toBe(false)
  })

  it("keeps the report budget separate from both", () => {
    for (let i = 0; i < REPORT_RATE_LIMIT.max + 5; i += 1) checkRateLimit("1.2.3.4", now, REPORT_RATE_LIMIT)
    expect(checkRateLimit("1.2.3.4", now, REPORT_RATE_LIMIT).limited).toBe(true)
    expect(checkRateLimit("1.2.3.4", now, NEWS_RATE_LIMIT).limited).toBe(false)
    expect(checkRateLimit("1.2.3.4", now, IMAGE_RATE_LIMIT).limited).toBe(false)
  })

  it("still separates one address from another inside a bucket", () => {
    for (let i = 0; i < IMAGE_RATE_LIMIT.max + 5; i += 1) checkRateLimit("1.1.1.1", now, IMAGE_RATE_LIMIT)
    expect(checkRateLimit("1.1.1.1", now, IMAGE_RATE_LIMIT).limited).toBe(true)
    expect(checkRateLimit("2.2.2.2", now, IMAGE_RATE_LIMIT).limited).toBe(false)
  })

  it("defaults to the news rule, so existing callers are unchanged", () => {
    expect(NEWS_RATE_LIMIT.max).toBe(RATE_LIMIT_MAX_REQUESTS)
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i += 1) checkRateLimit("9.9.9.9", now)
    expect(checkRateLimit("9.9.9.9", now).limited).toBe(true)
    expect(checkRateLimit("9.9.9.9", now, NEWS_RATE_LIMIT).limited).toBe(true)
  })

  it("reports remaining against its own rule, not the global constant", () => {
    const first = checkRateLimit("3.3.3.3", now, IMAGE_RATE_LIMIT)
    expect(first.remaining).toBe(IMAGE_RATE_LIMIT.max - 1)
  })
})

describe("the image budget fits how the page actually loads", () => {
  // Numbers from the browser measurement described above. If someone lowers the
  // limit below what one full pass costs, this fails.
  const IMAGES_ON_LOAD = 6
  const IMAGES_AFTER_SCROLLING_EVERYTHING = 100

  it("allows several full passes over the list in one window", () => {
    expect(IMAGE_RATE_LIMIT.max).toBeGreaterThanOrEqual(IMAGES_AFTER_SCROLLING_EVERYTHING * 3)
  })

  it("would have been broken by the news budget", () => {
    // The bug this guards against: reusing the 30/minute news limit.
    expect(NEWS_RATE_LIMIT.max).toBeLessThan(IMAGES_AFTER_SCROLLING_EVERYTHING)
    expect(NEWS_RATE_LIMIT.max).toBeGreaterThan(IMAGES_ON_LOAD)
  })

  it("a reader scrolling the whole list once is never limited", () => {
    const now = 2_000_000
    for (let i = 0; i < IMAGES_AFTER_SCROLLING_EVERYTHING; i += 1) {
      expect(checkRateLimit("8.8.8.8", now, IMAGE_RATE_LIMIT).limited).toBe(false)
    }
  })
})
