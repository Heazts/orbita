// Verifies every foreground/background pairing in the design system against
// WCAG 2.2 contrast minimums, and simulates the three dichromacies to confirm
// that no two status colours collapse into each other.
//
// Run with: node scripts/check-contrast.mjs
// Exits non-zero if any pairing fails, so CI can gate on it.

const hex = (h) => {
  const v = h.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16))
}

// WCAG relative luminance (sRGB -> linear).
const luminance = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const contrast = (a, b) => {
  const [l1, l2] = [luminance(hex(a)), luminance(hex(b))].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// Brettel/Viénot-style dichromacy simulation in linearised sRGB. Used only to
// check that two colours stay *distinguishable*, not to reproduce exact
// perceived colour.
const toLinear = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const fromLinear = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
}

const MATRICES = {
  protanopia: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopia: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopia: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900],
}

function simulate(hexColor, kind) {
  const [r, g, b] = hex(hexColor).map(toLinear)
  const m = MATRICES[kind]
  return `#${[
    m[0] * r + m[1] * g + m[2] * b,
    m[3] * r + m[4] * g + m[5] * b,
    m[6] * r + m[7] * g + m[8] * b,
  ]
    .map((c) => fromLinear(c).toString(16).padStart(2, "0"))
    .join("")}`
}

// Perceptual distance in CIE Lab (deltaE 76). Good enough to answer "are these
// two still telling apart?" without pulling in a colour library.
function lab(hexColor) {
  const [r, g, b] = hex(hexColor).map(toLinear)
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
}
const deltaE = (a, b) => {
  const [l1, a1, b1] = lab(a)
  const [l2, a2, b2] = lab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

const LIGHT = {
  background: "#ffffff",
  card: "#ffffff",
  muted: "#f3f4f6",
  foreground: "#111111",
  mutedForeground: "#5b6472",
  primary: "#1d4ed8",
  primaryForeground: "#ffffff",
  success: "#046c4e",
  successForeground: "#ffffff",
  successSurface: "#e7f5ef",
  warning: "#a35200",
  warningForeground: "#ffffff",
  warningSurface: "#fdf1e3",
  danger: "#8b0000",
  dangerForeground: "#ffffff",
  dangerSurface: "#fdeaea",
  infoSurface: "#e8eefc",
  border: "#e5e7eb",
}

const DARK = {
  background: "#111111",
  card: "#1a1a1a",
  muted: "#1f1f1f",
  foreground: "#ffffff",
  mutedForeground: "#a8b0ba",
  primary: "#7aa7ff",
  // Dark mode lifts the primary to a light blue, so the text sitting *on* it
  // has to flip to near-black. White on #7aa7ff is only 2.4:1.
  primaryForeground: "#111111",
  success: "#5eead4",
  // Same flip as the primary: the dark theme's status colours are light fills,
  // so text on top of them has to be near-black.
  successForeground: "#111111",
  successSurface: "#0d2c25",
  warning: "#fbbf5c",
  warningForeground: "#111111",
  warningSurface: "#33240d",
  danger: "#f87171",
  dangerForeground: "#111111",
  dangerSurface: "#341313",
  infoSurface: "#14203a",
  border: "#2a2a2a",
}

// [foreground, background, minimum, label]
const pairs = (t, theme) => [
  [t.foreground, t.background, 4.5, "texto principal / fundo"],
  [t.foreground, t.card, 4.5, "texto principal / cartão"],
  [t.mutedForeground, t.background, 4.5, "texto secundário / fundo"],
  [t.mutedForeground, t.card, 4.5, "texto secundário / cartão"],
  [t.mutedForeground, t.muted, 4.5, "texto secundário / superfície muted"],
  [t.primary, t.background, 4.5, "primária / fundo"],
  [t.primary, t.card, 4.5, "primária / cartão"],
  [t.success, t.background, 4.5, "sucesso / fundo"],
  [t.warning, t.background, 4.5, "aviso / fundo"],
  [t.danger, t.background, 4.5, "erro / fundo"],
  [t.success, t.muted, 4.5, "sucesso / superfície muted"],
  [t.warning, t.muted, 4.5, "aviso / superfície muted"],
  [t.danger, t.muted, 4.5, "erro / superfície muted"],
  // Text sitting on a filled control or a tinted status surface.
  [t.primaryForeground, t.primary, 4.5, "texto do botão / preenchimento primário"],
  // The Termo tiles and on-screen keyboard put text on a solid status fill.
  // The keys are 14px, so they need the full 4.5:1 rather than the 3:1 that
  // would be enough for the 24px tiles.
  [t.successForeground, t.success, 4.5, "texto sobre preenchimento de sucesso"],
  [t.warningForeground, t.warning, 4.5, "texto sobre preenchimento de aviso"],
  [t.dangerForeground, t.danger, 4.5, "texto sobre preenchimento de erro"],
  [t.success, t.successSurface, 4.5, "sucesso / superfície de sucesso"],
  [t.warning, t.warningSurface, 4.5, "aviso / superfície de aviso"],
  [t.danger, t.dangerSurface, 4.5, "erro / superfície de erro"],
  [t.primary, t.infoSurface, 4.5, "info / superfície de info"],
  [t.foreground, t.successSurface, 4.5, "texto principal / superfície de sucesso"],
  [t.foreground, t.warningSurface, 4.5, "texto principal / superfície de aviso"],
  [t.foreground, t.dangerSurface, 4.5, "texto principal / superfície de erro"],
  [t.foreground, t.infoSurface, 4.5, "texto principal / superfície de info"],
  // WCAG 1.4.11: UI components and graphical objects need 3:1, not 4.5:1.
  [t.border, t.background, 1.2, "borda / fundo (decorativa)"],
].map(([fg, bg, min, label]) => ({ fg, bg, min, label, theme }))

let failures = 0

for (const [name, tokens] of [["claro", LIGHT], ["escuro", DARK]]) {
  console.log(`\n── Tema ${name} ──────────────────────────────────`)
  for (const { fg, bg, min, label } of pairs(tokens, name)) {
    const ratio = contrast(fg, bg)
    const ok = ratio >= min
    if (!ok) failures += 1
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${ratio.toFixed(2).padStart(5)}:1  (min ${min})  ${label}  ${fg} / ${bg}`,
    )
  }
}

// Status colours must stay distinguishable from one another for dichromats.
// deltaE < 15 in simulation means "these read as the same colour" — which is
// why every status in the UI also carries an icon and a text label.
console.log("\n── Distinção entre cores de estado sob daltonismo ──")
for (const [name, tokens] of [["claro", LIGHT], ["escuro", DARK]]) {
  const statuses = {
    sucesso: tokens.success,
    aviso: tokens.warning,
    erro: tokens.danger,
    info: tokens.primary,
  }
  for (const kind of Object.keys(MATRICES)) {
    const names = Object.keys(statuses)
    const worst = []
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const d = deltaE(simulate(statuses[names[i]], kind), simulate(statuses[names[j]], kind))
        worst.push({ pair: `${names[i]}/${names[j]}`, d })
      }
    }
    worst.sort((a, b) => a.d - b.d)
    const { pair, d } = worst[0]
    const ok = d >= 15
    if (!ok) failures += 1
    console.log(`${ok ? "PASS" : "FAIL"}  tema ${name} · ${kind.padEnd(13)} par mais próximo ${pair} ΔE ${d.toFixed(1)}`)
  }
}

console.log(
  failures === 0
    ? "\nTodos os pares atendem ao mínimo.\n"
    : `\n${failures} par(es) abaixo do mínimo.\n`,
)
process.exit(failures === 0 ? 0 : 1)
