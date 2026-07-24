// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_PREFERENCES, usePreferences } from "@/hooks/use-preferences"

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove("reduce-motion")
})

describe("usePreferences", () => {
  beforeEach(() => localStorage.clear())

  it("starts from the defaults", async () => {
    const { result } = renderHook(() => usePreferences())
    await waitFor(() => expect(result.current.prefs).toEqual(DEFAULT_PREFERENCES))
  })

  it("persists a changed preference to localStorage", async () => {
    const { result } = renderHook(() => usePreferences())
    await waitFor(() => expect(result.current.prefs.tone).toBe("balanced"))

    act(() => result.current.setPreference("tone", "all"))
    expect(result.current.prefs.tone).toBe("all")
    expect(JSON.parse(localStorage.getItem("orbita-prefs") ?? "{}").tone).toBe("all")
  })

  it("merges stored partial prefs over the defaults", async () => {
    localStorage.setItem("orbita-prefs", JSON.stringify({ newAlerts: false }))
    const { result } = renderHook(() => usePreferences())
    await waitFor(() => expect(result.current.prefs.newAlerts).toBe(false))
    // Missing keys fall back to defaults.
    expect(result.current.prefs.tone).toBe(DEFAULT_PREFERENCES.tone)
    expect(result.current.prefs.reduceMotion).toBe(DEFAULT_PREFERENCES.reduceMotion)
  })

  it("reflects reduceMotion on the document element", async () => {
    const { result } = renderHook(() => usePreferences())
    await waitFor(() => expect(result.current.prefs.reduceMotion).toBe(false))
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(false)

    act(() => result.current.setPreference("reduceMotion", true))
    await waitFor(() =>
      expect(document.documentElement.classList.contains("reduce-motion")).toBe(true),
    )
  })
})
