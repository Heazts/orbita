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

  // The header used to inline a hand-maintained copy of the grid as JSX, and
  // these tests existed to stop it drifting from the generator. It now points
  // at /icon.svg, which the generator writes — the two cannot drift, because
  // there is only one of them. What is still worth asserting is that the file
  // exists, is well-formed, and stays small enough to be worth serving.
  it("ships an icon.svg the header can point at", () => {
    const svg = readFileSync(
      fileURLToPath(new URL("../public/icon.svg", import.meta.url)),
      "utf8",
    )
    expect(svg).toContain("<svg")
    expect(svg).toContain('shape-rendering="crispEdges"')
    // Antialiasing off is what preserves the pixel-art read when scaled.
    expect(svg).toContain('viewBox="0 0 32 32"')
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

    const gridBlock = generator.match(/const GRID = \[([\s\S]*?)\n\]/)?.[1]
    expect(gridBlock).toBeDefined()
    const rows = Array.from(gridBlock!.matchAll(/"([.A-Z]+)"/g)).map((m) => m[1])

    // Size is read from the grid, never pinned: this mark has already been
    // redrawn at a different resolution once, and a hardcoded number turns a
    // redesign into a spurious failure instead of catching a real problem.
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.length === rows.length)).toBe(true)
    expect(mark).toContain(`viewBox="0 0 ${rows.length} ${rows.length}"`)

    // Rebuild the horizontal runs from the grid and require every one to be
    // present in the component. This is the guard against the header mark and
    // the favicon drifting apart.
    let runs = 0
    rows.forEach((row, y) => {
      let x = 0
      while (x < row.length) {
        const cell = row[x]
        if (cell === ".") {
          x += 1
          continue
        }
        let width = 1
        while (x + width < row.length && row[x + width] === cell) width += 1
        expect(mark).toContain(`<rect x="${x}" y="${y}" width="${width}" height="1" />`)
        runs += 1
        x += width
      }
    })
    expect(runs).toBeGreaterThan(0)
  })

  it("uses the mark in the header", () => {
    const header = readFileSync(
      fileURLToPath(new URL("../components/header.tsx", import.meta.url)),
      "utf8",
    )
    expect(header).toContain("<OrbitaMark")
  })

  it("keeps the SVG compact via run-length merging", () => {
    const svg = readFileSync(
      fileURLToPath(new URL("../public/icon.svg", import.meta.url)),
      "utf8",
    )
    const rects = svg.match(/<rect /g)?.length ?? 0
    const cells = 32 * 32

    // One rect per filled cell produced a 33 KB file. Merging horizontal runs
    // brought it under 10 KB. This guards the merging: if it regresses, the
    // rect count jumps back towards one-per-cell.
    expect(rects).toBeGreaterThan(0)
    expect(rects).toBeLessThan(cells / 3)
    expect(svg.length).toBeLessThan(12_000)

    // A merged run must actually appear, not just a low count from a sparse
    // sprite.
    expect(svg).toMatch(/<rect [^>]*width="([2-9]|\d\d)"/)
  })
})
