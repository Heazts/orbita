import { NewsDashboard } from "@/components/news-dashboard"
import { aggregateNews, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"

// Matches the API route's window so both share loadFeedCached's cache entry
// instead of each imposing its own revalidation schedule.
export const revalidate = 300

// Fetches the default (unfiltered) view on the server so the very first HTML
// response contains real headlines instead of an empty shell — previously
// NewsDashboard ("use client") only ever fetched from an effect after
// hydration, so the initial render was always just loading skeletons: no LCP
// content, and non-JS crawlers/social scrapers saw a blank page. The client
// dashboard still owns filtering, search and live updates via SWR; this only
// seeds its first paint.
export default async function Page() {
  const initialData = await aggregateNews(DEFAULT_NEWS_QUERY)
  return <NewsDashboard initialData={initialData} />
}
