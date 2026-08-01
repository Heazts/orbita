// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { Header } from "@/components/header"

afterEach(cleanup)

const props = {
  input: "",
  onInputChange: vi.fn(),
  filtersOpen: false,
  onFiltersOpenChange: vi.fn(),
  favoritesOnly: false,
  onFavoritesOnlyChange: vi.fn(),
  favoritesCount: 0,
  isValidating: false,
  hasData: true,
  newCount: 0,
  isLive: false,
  onRefresh: vi.fn(),
  preferencesOpen: false,
  onPreferencesToggle: vi.fn(),
  theme: "light" as const,
  onToggleTheme: vi.fn(),
}

/**
 * The two count badges are aria-hidden — they are small red circles that would
 * read as a bare number out of context. That is the right call for the badge,
 * but it means the count has to reach a screen reader through the button's name
 * or not at all. It used to be neither.
 */
describe("Header counts reach assistive technology", () => {
  it("names the number of new items on the refresh button", () => {
    render(<Header {...props} newCount={3} />)
    expect(screen.getByRole("button", { name: "Atualizar notícias (3 novas)" })).toBeTruthy()
  })

  it("agrees in number for a single new item", () => {
    render(<Header {...props} newCount={1} />)
    expect(screen.getByRole("button", { name: "Atualizar notícias (1 nova)" })).toBeTruthy()
  })

  it("says nothing about a count when there is none", () => {
    render(<Header {...props} newCount={0} />)
    expect(screen.getByRole("button", { name: "Atualizar notícias" })).toBeTruthy()
  })

  it("names the number of favourites on the favourites button", () => {
    render(<Header {...props} favoritesCount={12} />)
    expect(screen.getByRole("button", { name: "Ver favoritos (12)" })).toBeTruthy()
  })

  it("drops the count from the favourites button when empty", () => {
    render(<Header {...props} favoritesCount={0} />)
    expect(screen.getByRole("button", { name: "Ver favoritos" })).toBeTruthy()
  })

  // While a refresh is in flight the state matters more than the count.
  it("reports that it is refreshing instead of the count", () => {
    render(<Header {...props} isValidating newCount={5} />)
    expect(screen.getByRole("button", { name: "Atualizando..." })).toBeTruthy()
  })

  it("keeps the badges themselves hidden from the accessibility tree", () => {
    const { container } = render(<Header {...props} newCount={3} favoritesCount={2} />)
    const badges = [...container.querySelectorAll("span")].filter(
      (node) => node.textContent === "3" || node.textContent === "2",
    )
    expect(badges.length).toBeGreaterThan(0)
    for (const badge of badges) expect(badge.getAttribute("aria-hidden")).toBe("true")
  })

  it("caps a very large count in the badge", () => {
    render(<Header {...props} favoritesCount={150} />)
    expect(screen.getByText("99+")).toBeTruthy()
    // The real number still reaches the accessible name.
    expect(screen.getByRole("button", { name: "Ver favoritos (150)" })).toBeTruthy()
  })
})

describe("Header badge colours", () => {
  // White on --danger measures 2.77:1 in the dark theme, under the 4.5:1 this
  // 10px label needs. --danger-foreground flips to near-black there (6.83:1)
  // and is covered by scripts/check-contrast.mjs.
  it("uses the audited pair rather than hard-coded white", () => {
    const { container } = render(<Header {...props} newCount={1} favoritesCount={1} />)
    const badges = [...container.querySelectorAll("span")].filter((node) =>
      node.className.includes("rounded-full bg-danger"),
    )
    expect(badges.length).toBe(2)
    for (const badge of badges) {
      expect(badge.className).toContain("text-danger-foreground")
      expect(badge.className).not.toContain("text-white")
    }
  })
})

describe("Header search", () => {
  it("exposes the field as a search input, which is how the / shortcut finds it", () => {
    const { container } = render(<Header {...props} />)
    expect(container.querySelector('input[type="search"]')).toBeTruthy()
  })

  it("labels the clear button with the term it would clear", () => {
    render(<Header {...props} input="eleições" />)
    expect(screen.getByRole("button", { name: 'Limpar pesquisa por "eleições"' })).toBeTruthy()
  })
})
