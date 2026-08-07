// @vitest-environment jsdom
import { act } from "react"
import { renderToString } from "react-dom/server"
import { hydrateRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Header } from "@/components/header"
import { useTheme } from "@/hooks/use-theme"

/**
 * The header's theme toggle used to be rendered from useTheme(), which read the
 * <html> class during render. The server has no document, so it always produced
 * the light variant; the client read the class the boot script in
 * app/layout.tsx had already applied and produced the dark one. React rejected
 * the mismatched tree with error #418 — reproduced in a real browser against a
 * production build, where it surfaced as an uncaught page error for every
 * reader whose device is in dark mode, and threw away the server HTML for that
 * subtree that SSR exists to provide.
 *
 * The fix is that the theme is null until hydration, so both renders agree, and
 * the icon is chosen by CSS (the dark: variant keys off the same class the boot
 * script sets) so nothing visibly swaps afterwards.
 */

const props = {
  input: "",
  onInputChange: vi.fn(),
  filtersOpen: false,
  onFiltersOpenChange: vi.fn(),
  favoritesOnly: false,
  onFavoritesOnlyChange: vi.fn(),
  favoritesCount: 0,
  isValidating: false,
  hasData: true,
  newCount: 0,
  isLive: false,
  onRefresh: vi.fn(),
  preferencesOpen: false,
  onPreferencesToggle: vi.fn(),
  onToggleTheme: vi.fn(),
}

// Tells React this is a test environment, so act() drives effects and flushes
// instead of warning that it cannot.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom ships no matchMedia, and useTheme subscribes to it while in system mode.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove("light", "dark")
  document.body.innerHTML = ""
})

/**
 * Renders on the "server", puts that HTML in the document, then hydrates over
 * it — the same sequence the browser performs. Returns whatever React reported
 * as recoverable, which is where a hydration mismatch shows up.
 */
async function hydrateOverServerHtml(
  serverProps: Partial<typeof props> & { theme: "light" | "dark" | null },
  clientProps: Partial<typeof props> & { theme: "light" | "dark" | null },
): Promise<unknown[]> {
  const recoverable: unknown[] = []
  const html = renderToString(<Header {...props} {...serverProps} />)
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)

  await act(async () => {
    hydrateRoot(container, <Header {...props} {...clientProps} />, {
      onRecoverableError: (error) => recoverable.push(error),
    })
  })
  return recoverable
}

describe("theme toggle hydration", () => {
  it("hydrates cleanly on a dark device, because neither render names a theme", async () => {
    // What the boot script does before React runs.
    document.documentElement.classList.add("dark")
    // useTheme returns null on the server and on the first client render alike.
    expect(await hydrateOverServerHtml({ theme: null }, { theme: null })).toEqual([])
  })

  it("hydrates cleanly on a light device", async () => {
    document.documentElement.classList.add("light")
    expect(await hydrateOverServerHtml({ theme: null }, { theme: null })).toEqual([])
  })

  it("reports a mismatch when the two renders disagree structurally", async () => {
    // Negative control: proves the harness above can actually see a mismatch,
    // so a clean result there means something. Uses the new-items badge, which
    // is an element that exists or does not — React silently patches a differing
    // attribute, but a differing tree is what produced #418 here (two different
    // icon elements) and is what this file is guarding.
    expect(
      await hydrateOverServerHtml({ theme: null, newCount: 0 }, { theme: null, newCount: 3 }),
    ).not.toEqual([])
  })
})

/** Renders exactly what useTheme reports, so hydration can be observed on it. */
function ThemeProbe() {
  const { theme } = useTheme()
  return <span>{theme ?? "desconhecido"}</span>
}

describe("useTheme under real hydration", () => {
  it("agrees with the server on a dark device, then resolves the real theme", async () => {
    // The boot script has already painted the page dark before React runs.
    document.documentElement.classList.add("dark")

    const recoverable: unknown[] = []
    // The server has no document and must not guess: useSyncExternalStore's
    // server snapshot is null.
    const html = renderToString(<ThemeProbe />)
    expect(html).toContain("desconhecido")

    const container = document.createElement("div")
    container.innerHTML = html
    document.body.appendChild(container)

    await act(async () => {
      hydrateRoot(container, <ThemeProbe />, {
        onRecoverableError: (error) => recoverable.push(error),
      })
    })

    // Hydrated against the server snapshot, so nothing mismatched…
    expect(recoverable).toEqual([])
    // …and React then switched to the live snapshot.
    expect(container.textContent).toBe("dark")
  })
})

describe("theme toggle markup", () => {
  it("ships both icons and lets CSS pick, so nothing swaps after hydration", () => {
    const html = renderToString(<Header {...props} theme={null} />)
    // Rendering one icon from JS state would mean a dark-theme reader sees the
    // light icon until hydration completes.
    expect(html).toContain("dark:hidden")
    expect(html).toContain("dark:block")
  })

  it("names the toggle without asserting a theme before one is known", () => {
    const html = renderToString(<Header {...props} theme={null} />)
    expect(html).toContain("Alternar entre tema claro e escuro")
    expect(html).not.toContain("Ativar tema claro")
    expect(html).not.toContain("Ativar tema escuro")
  })

  it("names the resulting theme once hydration has resolved one", () => {
    expect(renderToString(<Header {...props} theme="dark" />)).toContain("Ativar tema claro")
    expect(renderToString(<Header {...props} theme="light" />)).toContain("Ativar tema escuro")
  })
})
