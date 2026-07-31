// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useNotice } from "@/hooks/use-notice"

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useNotice", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useNotice())
    expect(result.current.notice).toBe("")
  })

  it("shows a message and clears it after the timeout", () => {
    const { result } = renderHook(() => useNotice())
    act(() => result.current.showNotice("Link copiado"))
    expect(result.current.notice).toBe("Link copiado")

    act(() => {
      vi.advanceTimersByTime(2_500)
    })
    expect(result.current.notice).toBe("")
  })

  // The reason this is a hook rather than three loose pieces: a second notice
  // must cancel the first one's pending dismissal. Without that, the earlier
  // timer fires mid-way through the newer message and clears it early.
  it("restarts the countdown when a second notice replaces the first", () => {
    const { result } = renderHook(() => useNotice())
    act(() => result.current.showNotice("Primeiro"))

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    act(() => result.current.showNotice("Segundo"))
    expect(result.current.notice).toBe("Segundo")

    // At this point the first notice's original timer would have fired.
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current.notice).toBe("Segundo")

    act(() => {
      vi.advanceTimersByTime(1_500)
    })
    expect(result.current.notice).toBe("")
  })

  it("cancels the pending dismissal on unmount", () => {
    const clearSpy = vi.spyOn(window, "clearTimeout")
    const { result, unmount } = renderHook(() => useNotice())
    act(() => result.current.showNotice("Qualquer"))
    unmount()
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it("keeps showNotice referentially stable", () => {
    const { result, rerender } = renderHook(() => useNotice())
    const first = result.current.showNotice
    rerender()
    expect(result.current.showNotice).toBe(first)
  })
})
