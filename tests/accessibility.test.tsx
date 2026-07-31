// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import { Modal } from "@/components/ui/modal"
import { StatusMessage } from "@/components/ui/status-message"

// Regression guards for the accessibility work, aimed at the parts that are
// easy to break silently in a refactor. Deliberately no axe-core: generic rule
// sweeps mostly restate what the framework already guarantees, and the
// failures that actually happened here were specific — a skip link pointing at
// an id nobody rendered, a modal focusing its close button instead of itself,
// a status carried by colour alone.
//
// Contrast is covered separately and numerically by scripts/check-contrast.mjs.

const projectFile = (relative: string) => readFileSync(join(process.cwd(), relative), "utf8")

afterEach(cleanup)

describe("skip link", () => {
  // WCAG 2.2 SC 2.4.1. It lives in the root layout so it exists on every page
  // and is genuinely the first focusable element; it used to live in the
  // header, where it only existed on pages that rendered one.
  const layout = () => projectFile("app/layout.tsx")

  it("is rendered in the root layout", () => {
    expect(layout()).toContain('className="skip-link"')
  })

  it("targets an id that every page landmark actually uses", () => {
    const target = layout().match(/href="#([\w-]+)"[^>]*className="skip-link"/)?.[1]
    expect(target).toBeDefined()

    // Every <main> in the app must carry that id, or the link dead-ends on
    // whichever page forgot it.
    const withMain = [
      "components/news-dashboard.tsx",
      "components/legal-page.tsx",
      "components/games/game-shell.tsx",
      "components/ui/error-state.tsx",
      "app/estudantes/page.tsx",
      "app/jogos/page.tsx",
    ]
    for (const file of withMain) {
      const source = projectFile(file)
      // Matched across newlines: several of these write the opening tag over
      // multiple lines, and a single-line match reports a false failure.
      const hasLandmark = new RegExp(`<main[\\s\\S]{0,200}?id="${target}"`).test(source)
      expect(hasLandmark, `${file} deveria ter <main id="${target}">`).toBe(true)
    }
  })

  it("is visible when focused rather than hidden outright", () => {
    // A skip link that stays off-screen while focused is unusable for sighted
    // keyboard users, which is the group it exists for.
    const css = projectFile("app/globals.css")
    expect(css).toContain(".skip-link:focus-visible")
  })
})

describe("focus indicator", () => {
  it("is defined for every interactive element in one rule", () => {
    const css = projectFile("app/globals.css")
    expect(css).toMatch(/:where\(a, button, input, select, textarea, summary, \[tabindex\]\):focus-visible/)
  })

  it("uses outline, which forced-colors mode preserves", () => {
    const css = projectFile("app/globals.css")
    const rule = css.slice(css.indexOf(":focus-visible"))
    // box-shadow rings are dropped entirely in Windows High Contrast.
    expect(rule).toContain("outline:")
  })

  it("never removes the indicator without a replacement", () => {
    // Comments stripped first: the rule below is *described* in prose nearby,
    // and scanning the raw file matches the description instead of the code.
    const css = projectFile("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "")

    // The only `outline: none` allowed is the one paired with :not(:focus-visible),
    // which suppresses the ring for mouse clicks while keeping it for keyboard.
    const occurrences = [...css.matchAll(/outline:\s*none/g)]
    for (const match of occurrences) {
      const context = css.slice(Math.max(0, match.index - 200), match.index)
      expect(context, "outline:none sem :focus-visible no seletor").toContain("focus-visible")
    }
  })
})

describe("Modal", () => {
  const open = (onClose = vi.fn()) =>
    render(
      <Modal title="Título de teste" onClose={onClose}>
        <button type="button">Primeiro</button>
        <button type="button">Último</button>
      </Modal>,
    )

  // Plain DOM assertions rather than jest-dom matchers: adding
  // @testing-library/jest-dom just for toHaveAttribute would be a dependency
  // for sugar, and resolving aria-labelledby by hand is what the assertion
  // actually means anyway.
  it("is announced as a dialog with its title as the accessible name", () => {
    open()
    const dialog = screen.getByRole("dialog")
    expect(dialog.getAttribute("aria-modal")).toBe("true")

    const labelledBy = dialog.getAttribute("aria-labelledby")
    expect(labelledBy).toBeTruthy()
    expect(document.getElementById(labelledBy!)?.textContent).toBe("Título de teste")
  })

  it("moves focus to the dialog itself, not to a control inside it", () => {
    // Focusing the close button first made screen readers announce "Fechar"
    // before the dialog's own title.
    open()
    expect(document.activeElement).toBe(screen.getByRole("dialog"))
  })

  it("closes on Escape", () => {
    const onClose = vi.fn()
    open(onClose)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("restores focus to whatever opened it", () => {
    const opener = document.createElement("button")
    document.body.appendChild(opener)
    opener.focus()
    expect(document.activeElement).toBe(opener)

    const { unmount } = open()
    unmount()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it("locks background scrolling while open and restores it after", () => {
    const { unmount } = open()
    expect(document.body.style.overflow).toBe("hidden")
    unmount()
    expect(document.body.style.overflow).not.toBe("hidden")
  })

  it("keeps focus inside the dialog when Tab reaches the end", () => {
    open()
    const buttons = screen.getAllByRole("button")
    const last = buttons[buttons.length - 1]
    last.focus()
    fireEvent.keyDown(document, { key: "Tab" })

    // Asserts containment, not which element receives focus. jsdom reports
    // offsetParent as null for everything, so the trap's visibility filter sees
    // a different candidate list than a browser would — pinning the exact
    // landing element here would test jsdom, not the component. What matters,
    // and what holds in both, is that focus never escapes to the page behind.
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true)
  })

  it("gives the close control an accessible name", () => {
    open()
    expect(screen.getByRole("button", { name: "Fechar" })).toBeTruthy()
  })
})

describe("StatusMessage", () => {
  // The rule the design system rests on: colour is never the only carrier of
  // meaning. Each variant must also ship an icon and a written label.
  it.each([
    ["success", "Sucesso"],
    ["warning", "Aviso"],
    ["danger", "Erro"],
    ["info", "Informação"],
  ] as const)("names the %s variant in text, not just colour", (variant, label) => {
    render(<StatusMessage variant={variant} title="Mensagem" />)
    expect(screen.getByText(`${label}:`, { exact: false })).toBeTruthy()
  })

  it("carries an icon alongside the colour", () => {
    const { container } = render(<StatusMessage variant="danger" title="Falhou" />)
    expect(container.querySelector("svg")).toBeTruthy()
  })

  it("hides the decorative icon from assistive tech", () => {
    const { container } = render(<StatusMessage variant="info" title="Nota" />)
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  })

  it("announces politely by default and assertively only when asked", () => {
    const { rerender } = render(<StatusMessage variant="info" title="Nota" />)
    expect(screen.getByRole("status")).toBeTruthy()

    rerender(<StatusMessage variant="danger" title="Falhou" live="assertive" />)
    // role="alert" already implies assertive; using both would double up.
    expect(screen.getByRole("alert")).toBeTruthy()
  })
})
