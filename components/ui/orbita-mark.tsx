/**
 * The Órbita mark, inline.
 *
 * Kept as JSX rather than an <img src="/icon.svg"> so it inherits currentColor:
 * the same component then works on the header, on a filled button, and in
 * forced-colors mode, without shipping a second asset per surface. The cell
 * coordinates mirror the GRID in scripts/generate-icons.mjs — change one and
 * regenerate the other with `node scripts/generate-icons.mjs`.
 *
 * shapeRendering="crispEdges" disables antialiasing, which is what keeps the
 * cell boundaries hard at any size. Without it a browser scaling this to 36px
 * would soften every edge and undo the pixel-art read.
 */

// Ring cells, by row: [row, [columns]]
const RING: Array<[number, number[]]> = [
  [1, [5, 6, 7, 8, 9, 10]],
  [2, [3, 4, 11, 12]],
  [3, [2, 13]],
  [4, [1, 14]],
  [5, [0, 15]],
  [6, [0, 15]],
  [7, [0, 15]],
  [8, [0, 15]],
  [9, [0, 15]],
  [10, [0, 15]],
  [11, [1, 14]],
  [12, [2, 13]],
  [13, [3, 4, 11, 12]],
  [14, [5, 6, 7, 8, 9, 10]],
]

const BODY: Array<[number, number[]]> = [
  [6, [6, 7, 8, 9]],
  [7, [5, 6, 7, 8, 9, 10]],
  [8, [5, 6, 7, 8, 9, 10]],
  [9, [6, 7, 8, 9]],
]

type OrbitaMarkProps = {
  className?: string
  /** Set when the mark stands alone as a link's only content. */
  title?: string
}

export function OrbitaMark({ className = "", title }: OrbitaMarkProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      {RING.map(([row, columns]) =>
        columns.map((column) => (
          <rect
            key={`r${row}-${column}`}
            x={column}
            y={row}
            width={1}
            height={1}
            fill="currentColor"
            // The ring is held back from full strength so the body reads as the
            // subject. In monochrome and forced-colors this opacity is the only
            // thing separating the two, which is why the gap between them is a
            // whole cell wide as well.
            opacity={0.55}
          />
        )),
      )}
      {BODY.map(([row, columns]) =>
        columns.map((column) => (
          <rect key={`b${row}-${column}`} x={column} y={row} width={1} height={1} fill="currentColor" />
        )),
      )}
    </svg>
  )
}
