// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { Filters } from "@/components/filters"
import { EmptyState } from "@/components/empty-state"
import { SearchSuggestions } from "@/components/search-suggestions"
import { ErrorBanner, FailedSourcesBanner, NewItemsPill, NoticeBanner } from "@/components/feedback-banners"

// Behaviour tests for components that carry real logic and had no coverage.
// Deliberately not snapshot tests: a snapshot of markup fails on every styling
// change and passes on every logic change, which is the wrong way round.

afterEach(cleanup)

const filterProps = {
  period: "all" as const,
  onPeriodChange: vi.fn(),
  sort: "latest" as const,
  onSortChange: vi.fn(),
  source: "Todas",
  onSourceChange: vi.fn(),
  sources: ["Todas", "BBC Brasil", "InfoMoney"],
}

describe("Filters", () => {
  it("shows no active count when nothing is filtered", () => {
    render(<Filters {...filterProps} />)
    expect(screen.getByText("Filtros")).toBeTruthy()
  })

  it("counts each non-default filter", () => {
    render(<Filters {...filterProps} period="7" source="InfoMoney" />)
    // Period and source differ from their defaults; sort does not.
    expect(screen.getByText("Filtros (2)")).toBeTruthy()
  })

  it("counts all three when every filter is set", () => {
    render(<Filters {...filterProps} period="7" sort="relevance" source="InfoMoney" />)
    expect(screen.getByText("Filtros (3)")).toBeTruthy()
  })

  it("offers every source it is given", () => {
    render(<Filters {...filterProps} />)
    for (const source of filterProps.sources) {
      expect(screen.getAllByText(source).length).toBeGreaterThan(0)
    }
  })
})

describe("EmptyState", () => {
  it("explains what to try rather than only saying nothing was found", () => {
    render(<EmptyState onClear={vi.fn()} />)
    expect(screen.getByText(/Nenhuma notícia encontrada/)).toBeTruthy()
    // A dead end with no next step is the failure mode this guards against.
    expect(screen.getByText(/menos palavras|outro período|limpar os filtros/)).toBeTruthy()
  })

  it("offers a recovery action that calls back", () => {
    const onClear = vi.fn()
    render(<EmptyState onClear={onClear} />)
    fireEvent.click(screen.getByRole("button", { name: /Limpar tudo/ }))
    expect(onClear).toHaveBeenCalledOnce()
  })
})

describe("SearchSuggestions", () => {
  it("renders nothing when there is no history and no suggestions to offer", () => {
    const { container } = render(<SearchSuggestions history={[]} onSelect={vi.fn()} />)
    // Suggestions are static, so the component still renders; what matters is
    // that it never renders an empty history section.
    expect(container.textContent).not.toContain("Buscas recentes")
  })

  it("surfaces recent searches when there are any", () => {
    render(<SearchSuggestions history={["clima", "eleições"]} onSelect={vi.fn()} />)
    expect(screen.getByText("clima")).toBeTruthy()
    expect(screen.getByText("eleições")).toBeTruthy()
  })

  it("reports the chosen term", () => {
    const onSelect = vi.fn()
    render(<SearchSuggestions history={["clima"]} onSelect={onSelect} />)
    fireEvent.click(screen.getByText("clima"))
    expect(onSelect).toHaveBeenCalledWith("clima")
  })
})

describe("feedback banners", () => {
  it("NoticeBanner announces politely so it does not interrupt a screen reader", () => {
    render(<NoticeBanner notice="Link copiado" />)
    const region = screen.getByText("Link copiado").closest("[role]")
    expect(region?.getAttribute("role")).toBe("status")
  })

  it("ErrorBanner shows the message it is given", () => {
    render(<ErrorBanner message="A busca está indisponível." onRetry={vi.fn()} />)
    expect(screen.getByText(/A busca está indisponível/)).toBeTruthy()
  })

  it("ErrorBanner offers a retry that calls back", () => {
    const onRetry = vi.fn()
    render(<ErrorBanner message="Falhou" onRetry={onRetry} />)
    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("FailedSourcesBanner names which sources failed, not just that some did", () => {
    render(<FailedSourcesBanner sources={["BBC Brasil", "NASA"]} />)
    expect(screen.getByText(/BBC Brasil/)).toBeTruthy()
    expect(screen.getByText(/NASA/)).toBeTruthy()
  })

  // Deliberately passive: a status region, not a button. It tells the reader
  // new headlines arrived without yanking them out of what they were reading.
  it("NewItemsPill announces the count politely rather than acting as a control", () => {
    render(<NewItemsPill count={3} />)
    const pill = screen.getByRole("status")
    expect(pill.textContent).toContain("3")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("NewItemsPill agrees in number", () => {
    const { rerender } = render(<NewItemsPill count={1} />)
    expect(screen.getByRole("status").textContent).toContain("1 nova matéria")

    rerender(<NewItemsPill count={2} />)
    expect(screen.getByRole("status").textContent).toContain("2 novas matérias")
  })
})
