/**
 * Shapes and category vocabulary shared across the aggregator.
 *
 * Split out of a single 530-line lib/news.ts that had grown six unrelated
 * responsibilities. Nothing here imports anything, which is what lets the
 * other three modules depend on it without a cycle.
 */

export const NEWS_CATEGORIES = [
  "Todas",
  "Mundo",
  "Boas notícias",
  "Política",
  "Economia",
  "Tecnologia",
  "Cyber & IA",
  "Ciência",
  "Educação",
  "Saúde",
  "Esportes",
  "Cultura",
  "Entretenimento",
  "Meio Ambiente",
] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

export type NewsItem = {
  id: string
  title: string
  description: string
  url: string
  image: string | null
  source: string
  category: Exclude<NewsCategory, "Todas">
  publishedAt: string
  // Set only when lib/clustering.ts merges this item with equivalent coverage
  // from other outlets (same story, different URL/headline). Absent — not 1 —
  // for a story with no known duplicates, so the common case carries no noise.
  sourcesCount?: number
  relatedSources?: string[]
}

export type NewsResponse = {
  items: NewsItem[]
  updatedAt: string
  sourceCount: number
  isFallback?: boolean
  isLive?: boolean
  // Names of feed sources that failed to load for this response, so the client
  // can tell the user some sources are temporarily unavailable.
  failedSources?: string[]
}

export type FeedSource = {
  name: string
  url: string
  category: Exclude<NewsCategory, "Todas">
}
