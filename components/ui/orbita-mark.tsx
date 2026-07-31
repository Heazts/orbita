/**
 * The Órbita mark — an astronaut — inline.
 *
 * Generated from the GRID and PALETTE in scripts/generate-icons.mjs by the
 * design script; edit the grid there and regenerate. tests/icons.test.ts
 * rebuilds these runs from that grid and fails if the two ever drift apart, so
 * the header mark and the favicon cannot disagree.
 *
 * Inline rather than <img src="/icon.svg"> — the same artwork exists as a file
 * for the favicon, so serving it twice looked wasteful at first. Measured: the
 * markup is ~8.8 KB raw but 844 bytes gzipped, about 1.3% of the page's HTML.
 * That is cheaper than a second request, it cannot flash in after paint, and it
 * avoids suppressing the no-img-element lint rule to do it.
 *
 * Colour is a fixed palette, not currentColor. A character cannot invert with
 * the theme — a mascot rendered in negative reads as a different character — so
 * the palette is chosen to hold on white, on near-black and on mid greys, with
 * the dark outline guaranteeing the silhouette survives on any of them. In
 * forced-colors mode the OS overrides these fills and the sprite flattens to a
 * solid shape; the outline keeps it readable, and public/icon-mono.svg carries
 * a currentColor variant for surfaces that need one.
 *
 * Cells are merged into horizontal runs: one rect per filled cell came to 534
 * elements, the runs below to 146.
 *
 * shapeRendering="crispEdges" disables antialiasing, which is what keeps the
 * cell boundaries hard at any size. Without it a browser scaling this to 36px
 * would soften every edge and undo the pixel-art read.
 */

type OrbitaMarkProps = {
  className?: string
  /** Set when the mark stands alone as a link's only content. */
  title?: string
}

export function OrbitaMark({ className = "", title }: OrbitaMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      focusable="false"
    >
      <g fill="#07112f"><rect x="10" y="2" width="12" height="1" /><rect x="7" y="4" width="3" height="1" /><rect x="22" y="4" width="3" height="1" /><rect x="7" y="5" width="1" height="1" /><rect x="24" y="5" width="1" height="1" /><rect x="5" y="6" width="3" height="1" /><rect x="24" y="6" width="3" height="1" /><rect x="5" y="7" width="2" height="1" /><rect x="8" y="7" width="16" height="1" /><rect x="25" y="7" width="2" height="1" /><rect x="8" y="8" width="1" height="1" /><rect x="23" y="8" width="1" height="1" /><rect x="8" y="9" width="1" height="1" /><rect x="23" y="9" width="1" height="1" /><rect x="8" y="10" width="1" height="1" /><rect x="23" y="10" width="1" height="1" /><rect x="8" y="11" width="1" height="1" /><rect x="23" y="11" width="1" height="1" /><rect x="8" y="12" width="1" height="1" /><rect x="23" y="12" width="1" height="1" /><rect x="8" y="13" width="1" height="1" /><rect x="23" y="13" width="1" height="1" /><rect x="5" y="14" width="2" height="1" /><rect x="8" y="14" width="16" height="1" /><rect x="25" y="14" width="2" height="1" /><rect x="5" y="15" width="3" height="1" /><rect x="24" y="15" width="3" height="1" /><rect x="7" y="16" width="1" height="1" /><rect x="24" y="16" width="1" height="1" /><rect x="7" y="17" width="18" height="1" /><rect x="7" y="18" width="18" height="1" /><rect x="8" y="19" width="1" height="1" /><rect x="23" y="19" width="1" height="1" /><rect x="6" y="20" width="3" height="1" /><rect x="23" y="20" width="3" height="1" /><rect x="6" y="21" width="1" height="1" /><rect x="25" y="21" width="1" height="1" /><rect x="6" y="22" width="1" height="1" /><rect x="25" y="22" width="1" height="1" /><rect x="6" y="23" width="1" height="1" /><rect x="25" y="23" width="1" height="1" /><rect x="6" y="24" width="1" height="1" /><rect x="25" y="24" width="1" height="1" /><rect x="6" y="25" width="1" height="1" /><rect x="25" y="25" width="1" height="1" /><rect x="6" y="26" width="3" height="1" /><rect x="23" y="26" width="3" height="1" /><rect x="8" y="27" width="2" height="1" /><rect x="15" y="27" width="2" height="1" /><rect x="22" y="27" width="2" height="1" /><rect x="8" y="28" width="2" height="1" /><rect x="15" y="28" width="2" height="1" /><rect x="22" y="28" width="2" height="1" /></g>
      <g fill="#dcebfa"><rect x="10" y="3" width="12" height="1" /><rect x="10" y="4" width="12" height="1" /><rect x="8" y="15" width="16" height="1" /><rect x="8" y="16" width="16" height="1" /><rect x="15" y="25" width="2" height="1" /><rect x="15" y="26" width="2" height="1" /></g>
      <g fill="#b9d1e8"><rect x="8" y="5" width="16" height="1" /><rect x="8" y="6" width="16" height="1" /></g>
      <g fill="#9db9d7"><rect x="7" y="7" width="1" height="1" /><rect x="24" y="7" width="1" height="1" /><rect x="7" y="8" width="1" height="1" /><rect x="24" y="8" width="1" height="1" /><rect x="7" y="9" width="1" height="1" /><rect x="24" y="9" width="1" height="1" /><rect x="7" y="10" width="1" height="1" /><rect x="24" y="10" width="1" height="1" /><rect x="7" y="11" width="1" height="1" /><rect x="24" y="11" width="1" height="1" /><rect x="7" y="12" width="1" height="1" /><rect x="24" y="12" width="1" height="1" /><rect x="7" y="13" width="1" height="1" /><rect x="24" y="13" width="1" height="1" /><rect x="7" y="14" width="1" height="1" /><rect x="24" y="14" width="1" height="1" /><rect x="7" y="21" width="2" height="1" /><rect x="23" y="21" width="2" height="1" /><rect x="7" y="22" width="2" height="1" /><rect x="23" y="22" width="2" height="1" /><rect x="7" y="23" width="2" height="1" /><rect x="23" y="23" width="2" height="1" /><rect x="7" y="24" width="2" height="1" /><rect x="23" y="24" width="2" height="1" /><rect x="7" y="25" width="2" height="1" /><rect x="23" y="25" width="2" height="1" /></g>
      <g fill="#516c96"><rect x="5" y="8" width="2" height="1" /><rect x="25" y="8" width="2" height="1" /><rect x="5" y="9" width="2" height="1" /><rect x="25" y="9" width="2" height="1" /><rect x="5" y="10" width="2" height="1" /><rect x="25" y="10" width="2" height="1" /><rect x="5" y="11" width="2" height="1" /><rect x="25" y="11" width="2" height="1" /><rect x="5" y="12" width="2" height="1" /><rect x="25" y="12" width="2" height="1" /><rect x="5" y="13" width="2" height="1" /><rect x="25" y="13" width="2" height="1" /><rect x="9" y="25" width="6" height="1" /><rect x="17" y="25" width="6" height="1" /><rect x="9" y="26" width="6" height="1" /><rect x="17" y="26" width="6" height="1" /></g>
      <g fill="#020817"><rect x="9" y="8" width="4" height="1" /><rect x="15" y="8" width="8" height="1" /><rect x="9" y="9" width="1" height="1" /><rect x="13" y="9" width="10" height="1" /><rect x="9" y="10" width="1" height="1" /><rect x="13" y="10" width="10" height="1" /><rect x="9" y="11" width="14" height="1" /><rect x="9" y="12" width="12" height="1" /><rect x="22" y="12" width="1" height="1" /><rect x="9" y="13" width="14" height="1" /></g>
      <g fill="#304a78"><rect x="13" y="8" width="2" height="1" /><rect x="9" y="29" width="6" height="1" /><rect x="17" y="29" width="6" height="1" /></g>
      <g fill="#ffffff"><rect x="10" y="9" width="1" height="1" /></g>
      <g fill="#3db7f2"><rect x="11" y="9" width="2" height="1" /><rect x="10" y="10" width="3" height="1" /></g>
      <g fill="#526f9d"><rect x="21" y="12" width="1" height="1" /></g>
      <g fill="#c9ddf0"><rect x="9" y="19" width="14" height="1" /><rect x="9" y="20" width="2" height="1" /><rect x="21" y="20" width="2" height="1" /><rect x="9" y="21" width="2" height="1" /><rect x="21" y="21" width="2" height="1" /><rect x="9" y="22" width="2" height="1" /><rect x="21" y="22" width="2" height="1" /><rect x="9" y="23" width="2" height="1" /><rect x="21" y="23" width="2" height="1" /><rect x="9" y="24" width="14" height="1" /></g>
      <g fill="#7895bb"><rect x="11" y="20" width="10" height="1" /><rect x="11" y="21" width="1" height="1" /><rect x="16" y="21" width="1" height="1" /><rect x="20" y="21" width="1" height="1" /><rect x="11" y="22" width="1" height="1" /><rect x="16" y="22" width="5" height="1" /><rect x="11" y="23" width="10" height="1" /></g>
      <g fill="#e32636"><rect x="12" y="21" width="2" height="1" /><rect x="12" y="22" width="2" height="1" /></g>
      <g fill="#249be5"><rect x="14" y="21" width="2" height="1" /><rect x="14" y="22" width="2" height="1" /></g>
      <g fill="#afc8df"><rect x="17" y="21" width="3" height="1" /><rect x="10" y="27" width="5" height="1" /><rect x="17" y="27" width="5" height="1" /><rect x="10" y="28" width="5" height="1" /><rect x="17" y="28" width="5" height="1" /></g>
    </svg>
  )
}
