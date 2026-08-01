import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8")
const header = readFileSync(new URL("../components/header.tsx", import.meta.url), "utf8")

/**
 * Every decorative animation has to be reachable by both ways a reader can ask
 * for less motion: the OS setting (`prefers-reduced-motion`) and the app's own
 * "Reduzir animações" preference, which sets `.reduce-motion` on <html>.
 *
 * These are easy to add and easy to forget — the animation works, nothing
 * fails, and the reader who asked for stillness simply does not get it.
 */
function block(selector: string): string {
  const start = css.indexOf(selector)
  expect(start, `${selector} not found in globals.css`).toBeGreaterThan(-1)
  return css.slice(start, start + 1_400)
}

const DECORATIVE_ANIMATIONS = [
  "orbita-drift",
  "live-pulse",
  "live-glow",
  "ticker-scroll-vertical",
  "fade-in-up",
]

describe("reduced motion", () => {
  it("declares every decorative animation as a keyframe", () => {
    for (const name of DECORATIVE_ANIMATIONS) {
      expect(css).toContain(`@keyframes ${name}`)
    }
  })

  it("turns the astronaut drift off under prefers-reduced-motion", () => {
    const media = block("@media (prefers-reduced-motion: reduce)")
    expect(media).toContain(".orbita-mark { animation: none; }")
  })

  it("turns the astronaut drift off under the app's own preference", () => {
    expect(css).toContain(".reduce-motion .orbita-mark { animation: none; }")
  })

  // The blanket .reduce-motion rule only shortens durations, so a transition
  // left in place becomes an instant jump rather than no movement at all.
  it("also cancels the hover nudge, not just the loop", () => {
    const media = block("@media (prefers-reduced-motion: reduce)")
    expect(media).toContain(".orbita-mark-link:focus-visible .orbita-mark { translate: 0 0; }")
    expect(css).toContain(
      ".reduce-motion .orbita-mark-link:focus-visible .orbita-mark { translate: 0 0; }",
    )
  })
})

describe("astronaut drift", () => {
  // The mark is pixel art drawn with shapeRendering="crispEdges". A smooth
  // translate lands it on fractional pixels, and the browser resamples the whole
  // sprite — every cell edge softens for the frames in between.
  it("steps between whole pixels so the pixel art stays crisp", () => {
    const rule = block(".orbita-mark {")
    expect(rule).toMatch(/animation:\s*orbita-drift[^;]*steps\(/)
  })

  it("uses whole-pixel offsets in every keyframe", () => {
    const frames = block("@keyframes orbita-drift")
    const offsets = [...frames.matchAll(/translate:\s*0\s+(-?\d+(?:\.\d+)?)px/g)].map((match) =>
      Number(match[1]),
    )
    expect(offsets.length).toBeGreaterThan(0)
    for (const offset of offsets) expect(Number.isInteger(offset)).toBe(true)
  })

  it("is applied to the mark in the header and wrapped by the hover target", () => {
    expect(header).toContain('className="orbita-mark size-9"')
    expect(header).toContain("orbita-mark-link")
  })

  // Decorative motion must not reach assistive tech as content.
  it("keeps the mark out of the accessibility tree", () => {
    const mark = readFileSync(new URL("../components/ui/orbita-mark.tsx", import.meta.url), "utf8")
    expect(mark).toContain('aria-hidden={title ? undefined : "true"}')
  })
})

describe("header focus", () => {
  // The logo is a link; replacing the browser outline is fine, dropping it is
  // not. Every other control in the header uses the same ring.
  it("gives the logo link a visible focus ring in place of the outline", () => {
    const logo = header.slice(header.indexOf("orbita-mark-link"), header.indexOf("ÓRBITA"))
    expect(logo).toContain("focus-visible:ring-2")
    expect(logo).toContain("focus-visible:ring-ring")
  })
})
