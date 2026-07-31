// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useNewItemsCount } from "@/hooks/use-new-items-count"
import type { NewsItem } from "@/lib/news"

const item = (id: string): NewsItem => ({
  id,
  title: `Manchete ${id}`,
  description: "",
  url: `https://example.com/${id}`,
  image: null,
  source: "Fonte",
  category: "Economia",
  publishedAt: new Date().toISOString(),
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("useNewItemsCount", () => {
  it("starts at zero", () => {
    const { result } = renderHook(() => useNewItemsCount(undefined))
    expect(result.current.newCount).toBe(0)
  })

  // Announcing "100 novas matérias" to someone who just opened the page is
  // noise, not news — the first batch is the baseline, not an arrival.
  it("does not count the first batch of items", () => {
    const { result, rerender } = renderHook(({ items }) => useNewItemsCount(items), {
      initialProps: { items: [item("a"), item("b")] as NewsItem[] | undefined },
    })
    rerender({ items: [item("a"), item("b")] })
    expect(result.current.newCount).toBe(0)
  })

  it("counts only ids that were not present before", () => {
    const first = [item("a"), item("b")]
    const { result, rerender } = renderHook(({ items }) => useNewItemsCount(items), {
      initialProps: { items: first as NewsItem[] | undefined },
    })
    // Second render establishes the baseline.
    rerender({ items: first })
    rerender({ items: [item("c"), ...first] })
    expect(result.current.newCount).toBe(1)
  })

  it("accumulates across refreshes", () => {
    const first = [item("a")]
    const { result, rerender } = renderHook(({ items }) => useNewItemsCount(items), {
      initialProps: { items: first as NewsItem[] | undefined },
    })
    rerender({ items: first })
    rerender({ items: [item("b"), item("a")] })
    rerender({ items: [item("c"), item("b"), item("a")] })
    expect(result.current.newCount).toBe(2)
  })

  it("ignores items that disappear from the list", () => {
    const first = [item("a"), item("b")]
    const { result, rerender } = renderHook(({ items }) => useNewItemsCount(items), {
      initialProps: { items: first as NewsItem[] | undefined },
    })
    rerender({ items: first })
    rerender({ items: [item("a")] })
    expect(result.current.newCount).toBe(0)
  })

  it("clears itself after the badge timeout", () => {
    const first = [item("a")]
    const { result, rerender } = renderHook(({ items }) => useNewItemsCount(items), {
      initialProps: { items: first as NewsItem[] | undefined },
    })
    rerender({ items: first })
    rerender({ items: [item("b"), item("a")] })
    expect(result.current.newCount).toBe(1)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.newCount).toBe(0)
  })

  it("can be reset on demand, for the refresh button", () => {
    const first = [item("a")]
    const { result, rerender } = renderHook(({ items }) => useNewItemsCount(items), {
      initialProps: { items: first as NewsItem[] | undefined },
    })
    rerender({ items: first })
    rerender({ items: [item("b"), item("a")] })
    expect(result.current.newCount).toBe(1)

    act(() => result.current.resetCount())
    expect(result.current.newCount).toBe(0)
  })
})
