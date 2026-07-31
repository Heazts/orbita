// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { NewsList } from "@/components/news-list"
import type { NewsItem } from "@/lib/news"

// Counts card renders by spying on <Highlight>, which every card renders with
// its own title. That identifies *which* card ran, not just how many.
//
// classifyTone was the first choice and was wrong: the card memoises it with
// useMemo keyed on the item, so it stays cached across re-renders and reports
// zero no matter what. A render proxy has to be something the body runs
// unconditionally.
const renderSpy = vi.hoisted(() => vi.fn<(text: string) => void>())
vi.mock("@/components/highlight", () => ({
  Highlight: ({ text }: { text: string }) => {
    renderSpy(text)
    return <>{text}</>
  },
}))

/** Titles seen since the last clear; descriptions are shared so they are ignored. */
const renderedTitles = () =>
  renderSpy.mock.calls.map(([text]) => text).filter((text) => text.startsWith("Manchete "))

const makeItems = (count: number): NewsItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    title: `Manchete ${index}`,
    description: "Descrição de teste com tamanho suficiente.",
    url: `https://example.com/${index}`,
    image: null,
    source: "Fonte",
    category: "Economia" as const,
    // Fixed well in the past, so relativeTime's output is stable across the
    // small clock advances used below.
    publishedAt: new Date("2020-01-01T00:00:00Z").toISOString(),
  }))

const NOOP = () => {}
const ITEMS = makeItems(30)
const BASE_NOW = new Date("2024-01-01T00:00:00Z").getTime()

const renderList = (props: Partial<Parameters<typeof NewsList>[0]> = {}) =>
  render(
    <NewsList
      items={ITEMS}
      now={BASE_NOW}
      query=""
      favorites={{}}
      onToggleFavorite={NOOP}
      onShare={NOOP}
      onQuickSummary={NOOP}
      onShowSources={NOOP}
      {...props}
    />,
  )

afterEach(() => {
  cleanup()
  renderSpy.mockClear()
})

describe("NewsList re-render behaviour", () => {
  it("renders every card once on mount", () => {
    renderList()
    expect(renderedTitles()).toHaveLength(ITEMS.length)
  })

  // The regression this guards: the dashboard owns the clock and re-renders on
  // every tick. Before the cards were memoised and the timestamp was turned
  // into a formatted string by the list, one minute passing re-rendered all
  // 100 cards to change nothing.
  it("does not re-render cards when the clock ticks but no displayed time changes", () => {
    const { rerender } = renderList()
    renderSpy.mockClear()

    // Two minutes later. Items dated in 2020 still read the same.
    rerender(
      <NewsList
        items={ITEMS}
        now={BASE_NOW + 120_000}
        query=""
        favorites={{}}
        onToggleFavorite={NOOP}
        onShare={NOOP}
        onQuickSummary={NOOP}
        onShowSources={NOOP}
      />,
    )

    expect(renderedTitles()).toHaveLength(0)
  })

  it("does not re-render cards when the parent re-renders with identical props", () => {
    const { rerender } = renderList()
    renderSpy.mockClear()
    rerender(
      <NewsList
        items={ITEMS}
        now={BASE_NOW}
        query=""
        favorites={{}}
        onToggleFavorite={NOOP}
        onShare={NOOP}
        onQuickSummary={NOOP}
        onShowSources={NOOP}
      />,
    )
    expect(renderedTitles()).toHaveLength(0)
  })

  // Correctness side of the same coin: memo must not swallow changes that
  // should be visible.
  it("re-renders cards when the search query changes, so highlighting updates", () => {
    const { rerender } = renderList()
    renderSpy.mockClear()
    rerender(
      <NewsList
        items={ITEMS}
        now={BASE_NOW}
        query="manchete"
        favorites={{}}
        onToggleFavorite={NOOP}
        onShare={NOOP}
        onQuickSummary={NOOP}
        onShowSources={NOOP}
      />,
    )
    expect(renderedTitles()).toHaveLength(ITEMS.length)
  })

  it("re-renders only the card whose favourite state changed", () => {
    const { rerender } = renderList()
    renderSpy.mockClear()
    rerender(
      <NewsList
        items={ITEMS}
        now={BASE_NOW}
        query=""
        favorites={{ "item-3": ITEMS[3] }}
        onToggleFavorite={NOOP}
        onShare={NOOP}
        onQuickSummary={NOOP}
        onShowSources={NOOP}
      />,
    )
    expect(renderedTitles()).toEqual(["Manchete 3"])
  })

  // Guards the prop shape that makes all of the above possible. If a handler
  // is ever wrapped in an inline arrow at the call site, memo compares two
  // different functions and every card re-renders regardless of the rest.
  it("is defeated by unstable handlers, which is why they are passed by reference", () => {
    const { rerender } = renderList()
    renderSpy.mockClear()
    rerender(
      <NewsList
        items={ITEMS}
        now={BASE_NOW}
        query=""
        favorites={{}}
        onToggleFavorite={NOOP}
        // A fresh function, as an inline arrow at the call site would be.
        onShare={() => {}}
        onQuickSummary={NOOP}
        onShowSources={NOOP}
      />,
    )
    expect(renderedTitles()).toHaveLength(ITEMS.length)
  })
})
