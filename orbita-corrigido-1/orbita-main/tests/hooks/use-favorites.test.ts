// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { useFavorites } from "@/hooks/use-favorites"
import type { NewsItem } from "@/lib/news"

afterEach(() => cleanup())

const ITEM: NewsItem = {
  id: "https://example.com/1",
  title: "Notícia de teste",
  description: "Resumo",
  url: "https://example.com/1",
  image: null,
  source: "Fonte Teste",
  category: "Mundo",
  publishedAt: new Date().toISOString(),
}

describe("useFavorites", () => {
  beforeEach(() => localStorage.clear())

  it("hydrates from localStorage after mount", async () => {
    localStorage.setItem("orbita-favorites", JSON.stringify({ [ITEM.id]: ITEM }))
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.favoritesCount).toBe(1))
    expect(result.current.favorites[ITEM.id]).toEqual(ITEM)
  })

  it("toggleFavorite adds then removes an item, persisting each change", async () => {
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.favoritesCount).toBe(0))

    act(() => result.current.toggleFavorite(ITEM))
    expect(result.current.favoritesCount).toBe(1)
    expect(JSON.parse(localStorage.getItem("orbita-favorites") ?? "{}")).toHaveProperty(ITEM.id)

    act(() => result.current.toggleFavorite(ITEM))
    expect(result.current.favoritesCount).toBe(0)
    expect(JSON.parse(localStorage.getItem("orbita-favorites") ?? "{}")).not.toHaveProperty(ITEM.id)
  })
})
