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

// 32x32 authoring grid — an astronaut bust.
//   "." transparent · "#" suit/helmet (foreground) · "o" visor and chest panel (accent)
//
// Authored at 32, not 16. A character needs a helmet, a neck and shoulders to
// read as a person, and 16 cells cannot hold all three legibly — the first
// attempt at this mark was drawn at 16 and came out looking like an eye. 32
// still divides evenly into every size shipped (32/32=1, 192/32=6, 512/32=16),
// so cells stay on whole pixels.
//
// Two decisions carry the whole read, both of them found by rendering and
// looking rather than by reasoning:
//
// 1. The visor is a window in the *lower* half of the dome, with four rows of
//    shell above it. An earlier draft let the visor fill nearly the whole
//    helmet; with no dome left, the silhouette stopped being a helmet.
//
// 2. The shoulder profile is per-row and deliberately not a smooth ramp.
//    Interpolating linearly from neck width to base width produces a cone,
//    which reads as a chess pawn. Real shoulders flare fast and then drop
//    almost vertically, and that change of angle is what the eye recognises.
//
// Regenerate assets after editing with `pnpm icons`; tests/icons.test.ts
// rebuilds the inline component's tables from this grid and fails on drift.
const GRID = [
  "................................",
  "............########............",
  "..........############..........",
  ".........##############.........",
  ".........##############.........",
  "........################........",
  "........################........",
  ".......##################.......",
  ".......##################.......",
  ".......#####oooooooo#####.......",
  ".......####oooooooooo####.......",
  ".......###oooooooooooo###.......",
  ".......##oooooooooooooo##.......",
  "........#oooooooooooooo#........",
  "........##oooooooooooo##........",
  ".........##oooooooooo##.........",
  ".........###oooooooo###.........",
  "..........############..........",
  "............########............",
  ".............######.............",
  ".............######.............",
  ".........##############.........",
  "......####################......",
  "....########################....",
  "...##########################...",
  "...##########################...",
  "...###########oooo###########...",
  "...##########oooooo##########...",
  "..###########oooooo###########..",
  "..############oooo############..",
  "..############################..",
  "..############################..",
]

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
function render({ size, suit, visor, background, cellSize = size / CELLS }) {
  if (!Number.isInteger(cellSize)) {
    throw new Error(`cellSize ${cellSize} must be a whole number of pixels`)
  }
  const margin = (size - CELLS * cellSize) / 2
  if (!Number.isInteger(margin) || margin < 0) {
    throw new Error(`margin ${margin} for size ${size} at cellSize ${cellSize} must be a non-negative integer`)
  }

  const rgba = Buffer.alloc(size * size * 4)
  const bg = background ? hexToRgba(background) : [0, 0, 0, 0]
  const suitColor = hexToRgba(suit)
  const visorColor = hexToRgba(visor)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cellY = Math.floor((y - margin) / cellSize)
      const cellX = Math.floor((x - margin) / cellSize)
      const inside = cellY >= 0 && cellY < CELLS && cellX >= 0 && cellX < CELLS
      const cell = inside ? GRID[cellY][cellX] : "."

      let color = bg
      if (cell === "#") color = suitColor
      else if (cell === "o") color = visorColor

      const offset = (y * size + x) * 4
      rgba[offset] = color[0]
      rgba[offset + 1] = color[1]
      rgba[offset + 2] = color[2]
      rgba[offset + 3] = color[3]
    }
  }

  return encodePng(size, size, rgba)
}

/** SVG built from the same grid, one <rect> per filled cell. */
function renderSvg({ suit, visor, background, monochrome = false }) {
  const rects = []
  if (background) {
    rects.push(`<rect width="${CELLS}" height="${CELLS}" fill="${background}"/>`)
  }
  for (let y = 0; y < CELLS; y += 1) {
    for (let x = 0; x < CELLS; x += 1) {
      const cell = GRID[y][x]
      if (cell === ".") continue
      const fill = monochrome ? "currentColor" : cell === "#" ? suit : visor
      const opacity = monochrome && cell === "o" ? ' opacity="0.65"' : ""
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"${opacity}/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CELLS} ${CELLS}" width="${CELLS}" height="${CELLS}" shape-rendering="crispEdges" role="img" aria-label="Órbita">
${rects.map((r) => `  ${r}`).join("\n")}
</svg>
`
}

// Palette drawn from the design tokens in app/globals.css.
const INK = "#111111"
const PAPER = "#ffffff"
const ACCENT_ON_LIGHT = "#1d4ed8"
const ACCENT_ON_DARK = "#7aa7ff"

const outputs = [
  // Favicons. 16px is one pixel per cell — the size the grid was drawn for.
  ["icon-light-32x32.png", render({ size: 32, suit: INK, visor: ACCENT_ON_LIGHT })],
  ["icon-dark-32x32.png", render({ size: 32, suit: PAPER, visor: ACCENT_ON_DARK })],
  // PWA / app icons need an opaque background: transparent PNGs render on an
  // unpredictable colour in launchers and on iOS.
  ["icon-192.png", render({ size: 192, suit: PAPER, visor: ACCENT_ON_DARK, background: INK })],
  ["icon-512.png", render({ size: 512, suit: PAPER, visor: ACCENT_ON_DARK, background: INK })],
  // Maskable: Android crops to an arbitrary shape, so the art has to sit
  // inside a safe zone. 28px cells give 448px of art on a 512px canvas — 87.5%,
  // comfortably inside the 80% circle the spec guarantees — with a whole-pixel
  // 32px margin on each side.
  [
    "icon-maskable-512.png",
    render({ size: 512, cellSize: 14, suit: PAPER, visor: ACCENT_ON_DARK, background: INK }),
  ],
  ["apple-icon.png", render({ size: 192, suit: PAPER, visor: ACCENT_ON_DARK, background: INK })],
]

await mkdir(PUBLIC, { recursive: true })
for (const [name, buffer] of outputs) {
  await writeFile(join(PUBLIC, name), buffer)
  console.log(`${name.padEnd(28)} ${String(buffer.length).padStart(7)} bytes`)
}

// The header mark uses currentColor so it inherits the surrounding text colour
// and therefore works on any surface, in either theme, and in forced-colors.
await writeFile(join(PUBLIC, "icon.svg"), renderSvg({ suit: INK, visor: ACCENT_ON_LIGHT }))
await writeFile(join(PUBLIC, "icon-mono.svg"), renderSvg({ monochrome: true }))
console.log("icon.svg, icon-mono.svg")
