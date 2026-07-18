// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useNow } from "@/hooks/use-now"

afterEach(() => cleanup())

describe("useNow", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("becomes a timestamp once mounted (renderHook flushes the mount effect synchronously)", () => {
    const { result } = renderHook(() => useNow())
    expect(typeof result.current).toBe("number")
  })

  it("advances on the given interval", () => {
    const { result } = renderHook(() => useNow(1_000))
    const first = result.current as number
    act(() => vi.advanceTimersByTime(1_000))
    expect(result.current).toBeGreaterThan(first)
  })
})
