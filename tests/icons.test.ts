import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const asset = (name: string) => readFileSync(fileURLToPath(new URL(`../public/${name}`, import.meta.url)))

/** Reads width and height out of a PNG's IHDR chunk. */
function pngSize(buffer: Buffer): { width: number; height: number } {
  expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  expect(buffer.subarray(12, 16).toString("ascii")).toBe("IHDR")
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

describe("generated icon assets", () => {
  it.each([
    ["icon-light-32x32.png", 32],
    ["icon-dark-32x32.png", 32],
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["icon-maskable-512.png", 512],
    ["apple-icon.png", 192],
  ])("%s is a valid PNG at %ipx square", (name, size) => {
    const { width, height } = pngSize(asset(name))
    expect(width).toBe(size)
    expect(height).toBe(size)
  })

  // The manifest declares these; a missing file makes the PWA install with a
  // broken icon, which no build step would otherwise catch.
  it("ships every icon the manifest references", () => {
    const manifest = readFileSync(fileURLToPath(new URL("../app/manifest.ts", import.meta.url)), "utf8")
    for (const match of manifest.matchAll(/src:\s*"\/([\w.-]+\.png)"/g)) {
      expect(() => asset(match[1])).not.toThrow()
    }
  })

  it("keeps the inline header mark in step with the generator grid", () => {
    const generator = readFileSync(
      fileURLToPath(new URL("../scripts/generate-icons.mjs", import.meta.url)),
      "utf8",
    )
    const mark = readFileSync(
      fileURLToPath(new URL("../components/ui/orbita-mark.tsx", import.meta.url)),
      "utf8",
    )

    const grid = generator.match(/const GRID = \[([\s\S]*?)\n\]/)?.[1]
    expect(grid).toBeDefined()
    const rows = Array.from(grid!.matchAll(/"([.o#]+)"/g)).map((m) => m[1])

    // The grid size is read from the grid itself rather than hardcoded: the
    // mark was authored at 16 and later redrawn at 32, and a pinned number
    // turns that redesign into a spurious test failure instead of catching a
    // real problem. What matters is that it is square and that the component
    // agrees with it.
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.length === rows.length)).toBe(true)
    expect(mark).toContain(`const CELLS = ${rows.length}`)

    // Rebuild the visor and suit cell lists from the grid and check the
    // component's tables agree. Without this the SVG in the header and the PNG
    // in the tab can silently diverge.
    const visorRows: string[] = []
    const suitRows: string[] = []
    rows.forEach((row, y) => {
      const visor = [...row].map((c, x) => (c === "o" ? x : -1)).filter((x) => x >= 0)
      const suit = [...row].map((c, x) => (c === "#" ? x : -1)).filter((x) => x >= 0)
      if (visor.length) visorRows.push(`[${y}, [${visor.join(", ")}]]`)
      if (suit.length) suitRows.push(`[${y}, [${suit.join(", ")}]]`)
    })

    expect(visorRows.length).toBeGreaterThan(0)
    expect(suitRows.length).toBeGreaterThan(0)
    for (const entry of visorRows) expect(mark).toContain(entry)
    for (const entry of suitRows) expect(mark).toContain(entry)
  })

  it("draws the mark from currentColor so it works on any surface and theme", () => {
    const mark = readFileSync(
      fileURLToPath(new URL("../components/ui/orbita-mark.tsx", import.meta.url)),
      "utf8",
    )
    expect(mark).toContain('fill="currentColor"')
    // Antialiasing off is what preserves the pixel-art read when scaled.
    expect(mark).toContain('shapeRendering="crispEdges"')
  })
})
