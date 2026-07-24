// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useTheme } from "@/hooks/use-theme"

// jsdom has no real matchMedia; a controllable stub lets us simulate the OS
// preference and its change events.
type Listener = (event: { matches: boolean }) => void

function stubMatchMedia(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<Listener>()
  const query = {
    get matches() {
      return dark
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
  }
  vi.stubGlobal("matchMedia", vi.fn(() => query))
  return {
    setDark(value: boolean) {
      dark = value
      for (const listener of listeners) listener({ matches: value })
    },
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("light", "dark")
    localStorage.clear()
  })

  it("reads the initial theme from the <html> class set by the inline script in layout.tsx", async () => {
    stubMatchMedia(true)
    document.documentElement.classList.add("dark")
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("dark"))
  })

  it("defaults to light when no theme class is present", async () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("light"))
  })

  it("hydrates the stored mode", async () => {
    stubMatchMedia(false)
    localStorage.setItem("orbita-theme", "dark")
    document.documentElement.classList.add("dark")
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.mode).toBe("dark"))
    expect(result.current.theme).toBe("dark")
  })

  it("toggleTheme flips to an explicit theme, swaps the DOM class and persists", async () => {
    stubMatchMedia(false)
    document.documentElement.classList.add("light")
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("light"))

    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe("dark")
    expect(result.current.mode).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.classList.contains("light")).toBe(false)
    expect(localStorage.getItem("orbita-theme")).toBe("dark")
  })

  it("setMode('system') resolves from the OS preference and persists 'system'", async () => {
    stubMatchMedia(true)
    document.documentElement.classList.add("light")
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("light"))

    act(() => result.current.setMode("system"))

    expect(result.current.mode).toBe("system")
    expect(result.current.theme).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("orbita-theme")).toBe("system")
  })

  it("in system mode, follows live OS theme changes", async () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode("system"))
    expect(result.current.theme).toBe("light")

    act(() => media.setDark(true))

    await waitFor(() => expect(result.current.theme).toBe("dark"))
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("an explicit mode ignores OS theme changes", async () => {
    const media = stubMatchMedia(false)
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMode("light"))

    act(() => media.setDark(true))

    expect(result.current.theme).toBe("light")
    expect(document.documentElement.classList.contains("light")).toBe(true)
  })
})
