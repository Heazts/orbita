/**
 * Shared filter types for the news dashboard and the Filters component.
 * Previously duplicated (without export) in both news-dashboard.tsx and filters.tsx.
 */

/** Time period filter. "live" = últimas 2h; "1"/"7"/"30" = N dias; "all" = sem filtro. */
export type Period = "all" | "1" | "7" | "30" | "live"

/** Sort order for the news list. */
export type Sort = "latest" | "relevance"
