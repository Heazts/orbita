/**
 * The Órbita mark — an astronaut bust — inline.
 *
 * Kept as JSX rather than an <img src="/icon.svg"> so it inherits currentColor:
 * the same component then works on the header, on a filled button, and in
 * forced-colors mode, without shipping a second asset per surface.
 *
 * The cell tables below are generated from the GRID in
 * scripts/generate-icons.mjs — edit the grid, then run `pnpm icons`.
 * tests/icons.test.ts rebuilds these tables from that grid and fails if the
 * two ever drift apart, so the header mark and the favicon cannot disagree.
 *
 * shapeRendering="crispEdges" disables antialiasing, which is what keeps the
 * cell boundaries hard at any size. Without it a browser scaling this to 36px
 * would soften every edge and undo the pixel-art read.
 */

const CELLS = 32

// Helmet shell, neck and shoulders.
const SUIT: Array<[number, number[]]> = [
  [1, [12, 13, 14, 15, 16, 17, 18, 19]],
  [2, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]],
  [3, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]],
  [4, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]],
  [5, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]],
  [6, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]],
  [7, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]],
  [8, [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]],
  [9, [7, 8, 9, 10, 11, 20, 21, 22, 23, 24]],
  [10, [7, 8, 9, 10, 21, 22, 23, 24]],
  [11, [7, 8, 9, 22, 23, 24]],
  [12, [7, 8, 23, 24]],
  [13, [8, 23]],
  [14, [8, 9, 22, 23]],
  [15, [9, 10, 21, 22]],
  [16, [9, 10, 11, 20, 21, 22]],
  [17, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]],
  [18, [12, 13, 14, 15, 16, 17, 18, 19]],
  [19, [13, 14, 15, 16, 17, 18]],
  [20, [13, 14, 15, 16, 17, 18]],
  [21, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]],
  [22, [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]],
  [23, [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]],
  [24, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]],
  [25, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]],
  [26, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]],
  [27, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]],
  [28, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
  [29, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
  [30, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
  [31, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]],
]

// Visor and chest panel.
const VISOR: Array<[number, number[]]> = [
  [9, [12, 13, 14, 15, 16, 17, 18, 19]],
  [10, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]],
  [11, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]],
  [12, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]],
  [13, [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]],
  [14, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]],
  [15, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]],
  [16, [12, 13, 14, 15, 16, 17, 18, 19]],
  [26, [14, 15, 16, 17]],
  [27, [13, 14, 15, 16, 17, 18]],
  [28, [13, 14, 15, 16, 17, 18]],
  [29, [14, 15, 16, 17]],
]

type OrbitaMarkProps = {
  className?: string
  /** Set when the mark stands alone as a link's only content. */
  title?: string
}

export function OrbitaMark({ className = "", title }: OrbitaMarkProps) {
  return (
    <svg
      viewBox={`0 0 ${CELLS} ${CELLS}`}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {SUIT.map(([row, columns]) =>
        columns.map((column) => (
          <rect
            key={`s${row}-${column}`}
            x={column}
            y={row}
            width={1}
            height={1}
            fill="currentColor"
          />
        )),
      )}
      {VISOR.map(([row, columns]) =>
        columns.map((column) => (
          <rect
            key={`v${row}-${column}`}
            x={column}
            y={row}
            width={1}
            height={1}
            fill="currentColor"
            // Everything is currentColor, so the visor is separated from the
            // helmet by opacity alone. Verified against the monochrome render:
            // at 0.6 the visor still reads as a distinct window rather than a
            // hole, which matters in forced-colors mode where the palette is
            // replaced and this is the only remaining cue.
            opacity={0.6}
          />
        )),
      )}
    </svg>
  )
}
