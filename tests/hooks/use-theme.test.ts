// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useTheme } from "@/hooks/use-theme"

afterEach(() => cleanup())

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("light", "dark")
    localStorage.clear()
  })

  it("reads the initial theme from the <html> class set by the inline script in layout.tsx", async () => {
    document.documentElement.classList.add("dark")
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("dark"))
  })

  it("defaults to light when no theme class is present", async () => {
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("light"))
  })

  it("toggleTheme flips the theme, swaps the DOM class and persists the choice", async () => {
    document.documentElement.classList.add("light")
    const { result } = renderHook(() => useTheme())
    await waitFor(() => expect(result.current.theme).toBe("light"))

    act(() => result.current.toggleTheme())

    expect(result.current.theme).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.classList.contains("light")).toBe(false)
    expect(localStorage.getItem("orbita-theme")).toBe("dark")
  })
})
