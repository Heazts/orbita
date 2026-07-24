// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useUrlQuery } from "@/hooks/use-url-query"

afterEach(() => cleanup())

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}`
}

describe("useUrlQuery", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("does not rewrite the URL on the first render", () => {
    window.history.replaceState(null, "", "/?q=brasil")
    renderHook(() => useUrlQuery("brasil", () => {}))
    expect(currentUrl()).toBe("/?q=brasil")
  })

  it("writes the term to the URL when a search starts", () => {
    const { rerender } = renderHook(({ q }) => useUrlQuery(q, () => {}), {
      initialProps: { q: "" },
    })
    rerender({ q: "eleição" })
    expect(window.location.search).toBe(`?q=${encodeURIComponent("eleição")}`)
  })

  it("pushes a history entry when starting a search, so Back undoes it", () => {
    const push = vi.spyOn(window.history, "pushState")
    const { rerender } = renderHook(({ q }) => useUrlQuery(q, () => {}), {
      initialProps: { q: "" },
    })
    rerender({ q: "brasil" })
    expect(push).toHaveBeenCalledTimes(1)
    push.mockRestore()
  })

  it("replaces while refining an existing term instead of stacking entries", () => {
    const push = vi.spyOn(window.history, "pushState")
    const replace = vi.spyOn(window.history, "replaceState")
    const { rerender } = renderHook(({ q }) => useUrlQuery(q, () => {}), {
      initialProps: { q: "" },
    })
    rerender({ q: "brasil" }) // starts the search → push
    push.mockClear()
    replace.mockClear()

    rerender({ q: "brasil economia" }) // refinement → replace

    expect(replace).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
    push.mockRestore()
    replace.mockRestore()
  })

  it("removes the parameter and pushes when the search is cleared", () => {
    const { rerender } = renderHook(({ q }) => useUrlQuery(q, () => {}), {
      initialProps: { q: "" },
    })
    rerender({ q: "brasil" })
    rerender({ q: "" })
    expect(currentUrl()).toBe("/")
  })

  it("does not add a duplicate entry when the URL already carries the term", () => {
    window.history.replaceState(null, "", "/?q=brasil")
    const push = vi.spyOn(window.history, "pushState")
    // Mount with an empty debounced query (as on a cold load), then settle on
    // the term the URL already has.
    const { rerender } = renderHook(({ q }) => useUrlQuery(q, () => {}), {
      initialProps: { q: "" },
    })
    rerender({ q: "brasil" })
    expect(push).not.toHaveBeenCalled()
    push.mockRestore()
  })

  it("reports the term back on Back/Forward navigation", () => {
    const onNavigate = vi.fn()
    renderHook(() => useUrlQuery("", onNavigate))

    act(() => {
      window.history.replaceState(null, "", "/?q=economia")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })

    expect(onNavigate).toHaveBeenCalledWith("economia")
  })
})
