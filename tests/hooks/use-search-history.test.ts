// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useSearchHistory } from "@/hooks/use-search-history"

afterEach(() => cleanup())

describe("useSearchHistory", () => {
  beforeEach(() => localStorage.clear())

  it("hydrates from localStorage after mount", async () => {
    localStorage.setItem("orbita-history", JSON.stringify(["brasil"]))
    const { result } = renderHook(() => useSearchHistory())
    await waitFor(() => expect(result.current.history).toEqual(["brasil"]))
  })

  it("addTerm prepends and dedupes case-insensitively", async () => {
    const { result } = renderHook(() => useSearchHistory())
    await waitFor(() => expect(result.current.history).toEqual([]))

    act(() => result.current.addTerm("Eleição"))
    act(() => result.current.addTerm("Economia"))
    act(() => result.current.addTerm("eleição"))

    expect(result.current.history).toEqual(["eleição", "Economia"])
    expect(JSON.parse(localStorage.getItem("orbita-history") ?? "[]")).toEqual(["eleição", "Economia"])
  })

  it("caps history at maxEntries, newest first", async () => {
    const { result } = renderHook(() => useSearchHistory(2))
    await waitFor(() => expect(result.current.history).toEqual([]))

    act(() => result.current.addTerm("a"))
    act(() => result.current.addTerm("b"))
    act(() => result.current.addTerm("c"))

    expect(result.current.history).toEqual(["c", "b"])
  })
})
