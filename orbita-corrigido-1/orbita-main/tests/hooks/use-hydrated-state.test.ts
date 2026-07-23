// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useHydratedState } from "@/hooks/use-hydrated-state"

afterEach(() => cleanup())

describe("useHydratedState", () => {
  beforeEach(() => localStorage.clear())

  it("returns the fallback before hydration", () => {
    const { result } = renderHook(() => useHydratedState("test-key", "fallback"))
    expect(result.current[0]).toBe("fallback")
  })

  it("hydrates from localStorage after mount", async () => {
    localStorage.setItem("test-key", JSON.stringify("stored-value"))
    const { result } = renderHook(() => useHydratedState("test-key", "fallback"))
    await waitFor(() => expect(result.current[0]).toBe("stored-value"))
  })

  it("updates state via setter", async () => {
    const { result } = renderHook(() => useHydratedState("test-key", 0))
    await waitFor(() => expect(result.current[0]).toBe(0))
    await act(async () => { result.current[1](42) })
    expect(result.current[0]).toBe(42)
  })

  it("handles object values", async () => {
    const { result } = renderHook(() =>
      useHydratedState<{ name: string }>("obj-key", { name: "default" }),
    )
    await waitFor(() => expect(result.current[0].name).toBe("default"))
  })
})
