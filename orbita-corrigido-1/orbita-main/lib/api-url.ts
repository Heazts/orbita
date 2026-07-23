import type { NewsCategory } from "@/lib/news"

export type Period = "all" | "1" | "7" | "30" | "live"
export type Sort = "latest" | "relevance"

// Builds the /api/news query string from UI state. Kept out of the component
// so it's unit-testable without rendering React (see tests/api-url.test.ts).
export function buildApiUrl(
  query: string,
  category: NewsCategory,
  period: Period,
  sort: Sort,
  source: string,
): string {
  const searchParams = new URLSearchParams()
  if (query) searchParams.set("q", query)
  if (category !== "Todas") searchParams.set("category", category)
  if (period === "live") {
    searchParams.set("period", "1")
    searchParams.set("live", "true")
  } else if (period !== "all") {
    searchParams.set("period", period)
  }
  if (sort !== "latest") searchParams.set("sort", sort)
  if (source !== "Todas") searchParams.set("source", source)
  const queryString = searchParams.toString()
  return `/api/news${queryString ? `?${queryString}` : ""}`
}
