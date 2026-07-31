/**
 * Generates the pixel-art identity from a single source grid.
 *
 * The mark is drawn here as a grid of cells rather than traced from the old
 * vector logo, because pixel art is a different language: it is authored at the
 * pixel, and downscaling a curve produces mush, not pixel art. Every asset the
 * site ships is rendered from GRID below, so the favicon, the header mark, the
 * PWA icons and the social image cannot drift apart.
 *
 * Subject: an astronaut bust — helmet, visor and shoulders. It replaced an
 * abstract orbit ring, which was on-theme but read as a letter O at small
 * sizes and gave the product no character.
 *
 * Run with: node scripts/generate-icons.mjs
 */

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const PUBLIC = join(ROOT, "public")

// 32x32 authoring grid — a full-body astronaut.
//
// The artwork is the maintainer's, supplied as an SVG and rasterised onto this
// grid by painting its rects in document order (scripts note: outline shapes
// are drawn first and covered by fills, so order matters). Keeping it as a grid
// rather than checking the SVG in directly is what lets one source produce the
// favicon, the PWA icons, the maskable variant and the monochrome fallback
// without any of them drifting.
//
// Letters are assigned per distinct colour in order of first appearance; see
// PALETTE below. Regenerate assets after editing with `pnpm icons`.
const GRID = [
  "................................",
  "................................",
  "..........AAAAAAAAAAAA..........",
  "..........BBBBBBBBBBBB..........",
  ".......AAABBBBBBBBBBBBAAA.......",
  ".......ACCCCCCCCCCCCCCCCA.......",
  ".....AAACCCCCCCCCCCCCCCCAAA.....",
  ".....AADAAAAAAAAAAAAAAAADAA.....",
  ".....EEDAFFFFGGFFFFFFFFADEE.....",
  ".....EEDAFHIIFFFFFFFFFFADEE.....",
  ".....EEDAFIIIFFFFFFFFFFADEE.....",
  ".....EEDAFFFFFFFFFFFFFFADEE.....",
  ".....EEDAFFFFFFFFFFFFJFADEE.....",
  ".....EEDAFFFFFFFFFFFFFFADEE.....",
  ".....AADAAAAAAAAAAAAAAAADAA.....",
  ".....AAABBBBBBBBBBBBBBBBAAA.....",
  ".......ABBBBBBBBBBBBBBBBA.......",
  ".......AAAAAAAAAAAAAAAAAA.......",
  ".......AAAAAAAAAAAAAAAAAA.......",
  "........AKKKKKKKKKKKKKKA........",
  "......AAAKKLLLLLLLLLLKKAAA......",
  "......ADDKKLMMNNLOOOLKKDDA......",
  "......ADDKKLMMNNLLLLLKKDDA......",
  "......ADDKKLLLLLLLLLLKKDDA......",
  "......ADDKKKKKKKKKKKKKKDDA......",
  "......ADDEEEEEEBBEEEEEEDDA......",
  "......AAAEEEEEEBBEEEEEEAAA......",
  "........AAOOOOOAAOOOOOAA........",
  "........AAOOOOOAAOOOOOAA........",
  ".........GGGGGG..GGGGGG.........",
  "................................",
  "................................",
]

// Fixed palette. Unlike the abstract mark this replaced, a character does not
// invert between themes — a mascot rendered in negative reads as a different
// character — so the palette holds on white, on near-black and on mid greys,
// and the dark outline is what guarantees the silhouette survives on any of
// them.
const PALETTE = {
  A: "#07112f",
  B: "#dcebfa",
  C: "#b9d1e8",
  D: "#9db9d7",
  E: "#516c96",
  F: "#020817",
  G: "#304a78",
  H: "#ffffff",
  I: "#3db7f2",
  J: "#526f9d",
  K: "#c9ddf0",
  L: "#7895bb",
  M: "#e32636",
  N: "#249be5",
  O: "#afc8df",
}

const CELLS = GRID.length

// --- Minimal PNG encoder -----------------------------------------------------
// Written out rather than pulled from a dependency: the project already had a
// clean `pnpm audit`, and adding an image library to draw 16 squares would be a
// poor trade. PNG needs zlib, which Node ships.

import { deflateSync } from "node:zlib"

const crcTable = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer) {
  let c = -1
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData))
  return Buffer.concat([length, typeAndData, crc])
}

/** Encodes RGBA pixel data as a PNG. */
function encodePng(width, height, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: RGBA
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // One filter byte per scanline. Filter 0 (None) keeps the encoder trivial and
  // costs nothing here — flat colour compresses to almost nothing regardless.
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const hexToRgba = (hex, alpha = 255) => {
  const v = hex.replace("#", "")
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
    alpha,
  ]
}

/**
 * Renders the grid onto a `size` x `size` canvas.
 *
 * `cellSize` must be a whole number of pixels and the resulting margin must be
 * whole too. That is the one rule that keeps pixel art crisp: the moment a cell
 * edge lands on a fractional pixel, some cells round up and their neighbours
 * round down, and outlines come out with uneven stroke widths.
 *
 * The first version of this function produced the inset (maskable) variant by
 * rendering at full size and then resampling down, which broke exactly that
 * rule — 512 to 448 is a 1.14x factor, so the helmet outline lost a pixel in
 * some places and kept it in others. Drawing straight at the target cell size
 * avoids the resample entirely.
 */
function render({ size, background, cellSize = size / CELLS }) {
  if (!Number.isInteger(cellSize)) {
    throw new Error(`cellSize ${cellSize} must be a whole number of pixels`)
  }
  const margin = (size - CELLS * cellSize) / 2
  if (!Number.isInteger(margin) || margin < 0) {
    throw new Error(`margin ${margin} for size ${size} at cellSize ${cellSize} must be a non-negative integer`)
  }

  const rgba = Buffer.alloc(size * size * 4)
  const bg = background ? hexToRgba(background) : [0, 0, 0, 0]
  const colors = Object.fromEntries(
    Object.entries(PALETTE).map(([key, hex]) => [key, hexToRgba(hex)]),
  )

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cellY = Math.floor((y - margin) / cellSize)
      const cellX = Math.floor((x - margin) / cellSize)
      const inside = cellY >= 0 && cellY < CELLS && cellX >= 0 && cellX < CELLS
      const cell = inside ? GRID[cellY][cellX] : "."

      const color = colors[cell] ?? bg

      const offset = (y * size + x) * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = color[3]
    }
  }

  return encodePng(size, size, rgba)
}

/**
 * SVG built from the same grid, one <rect> per filled cell.
 *
 * `monochrome` collapses the palette onto currentColor at three opacity steps,
 * for surfaces that must adopt the surrounding text colour. It is a fallback,
 * not the primary form: the colour sprite is what ships.
 */
function renderSvg({ background, monochrome = false }) {
  // Opacity derived from each colour's luminance, so the monochrome variant
  // preserves the artwork's own light-to-dark structure instead of relying on
  // a hand-kept table that silently rots when the palette changes.
  const MONO_OPACITY = Object.fromEntries(
    Object.entries(PALETTE).map(([key, hex]) => {
      const [r, g, b] = hexToRgba(hex)
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      // Dark cells (outline, visor) stay opaque; light cells fade back.
      return [key, Number((1 - luminance * 0.7).toFixed(2))]
    }),
  )
  const rects = []
  if (background) {
    rects.push(`<rect width="${CELLS}" height="${CELLS}" fill="${background}"/>`)
  }
  // Horizontal run-length merging. One <rect> per cell produced a 33 KB file
  // for a 32x32 sprite — most of it repeated coordinates for neighbouring cells
  // of the same colour. Merging each run of identical cells in a row into a
  // single wider rect cuts that by roughly four fifths with identical output.
  for (let y = 0; y < CELLS; y += 1) {
    let x = 0
    while (x < CELLS) {
      const cell = GRID[y][x]
      if (cell === ".") {
        x += 1
        continue
      }
      let run = 1
      while (x + run < CELLS && GRID[y][x + run] === cell) run += 1
      const fill = monochrome ? "currentColor" : PALETTE[cell]
      const opacity = monochrome ? ` opacity="${MONO_OPACITY[cell]}"` : ""
      rects.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"${opacity}/>`)
      x += run
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CELLS} ${CELLS}" width="${CELLS}" height="${CELLS}" shape-rendering="crispEdges" role="img" aria-label="Órbita">
${rects.map((r) => `  ${r}`).join("\n")}
</svg>
`
}

const INK = "#111111"

const outputs = [
  // The same sprite in both slots: the mascot does not invert between themes.
  // Both filenames are kept because app/layout.tsx references them from
  // media-scoped <link> tags.
  ["icon-light-32x32.png", render({ size: 32 })],
  ["icon-dark-32x32.png", render({ size: 32 })],
  // PWA / app icons need an opaque background: transparent PNGs render on an
  // unpredictable colour in launchers and on iOS.
  ["icon-192.png", render({ size: 192, background: INK })],
  ["icon-512.png", render({ size: 512, background: INK })],
  // Maskable: Android crops to an arbitrary shape, so the art has to sit
  // inside a safe zone. 14px cells give 448px of art on a 512px canvas —
  // 87.5%, comfortably inside the 80% circle the spec guarantees — with a
  // whole-pixel 32px margin on each side.
  ["icon-maskable-512.png", render({ size: 512, cellSize: 14, background: INK })],
  ["apple-icon.png", render({ size: 192, background: INK })],
]

await mkdir(PUBLIC, { recursive: true })
for (const [name, buffer] of outputs) {
  await writeFile(join(PUBLIC, name), buffer)
  console.log(`${name.padEnd(28)} ${String(buffer.length).padStart(7)} bytes`)
}

// The header mark uses currentColor so it inherits the surrounding text colour
// and therefore works on any surface, in either theme, and in forced-colors.
await writeFile(join(PUBLIC, "icon.svg"), renderSvg({}))
await writeFile(join(PUBLIC, "icon-mono.svg"), renderSvg({ monochrome: true }))
console.log("icon.svg, icon-mono.svg")
