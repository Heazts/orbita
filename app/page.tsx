import { NewsDashboard } from "@/components/news-dashboard"
import { aggregateNewsCached, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"

// No `export const revalidate` here on purpose. app/layout.tsx reads the CSP
// nonce from headers(), which makes every route under it dynamic — Next then
// serves this page with `Cache-Control: no-store` and a revalidate declaration
// has no effect at all. It used to be set to 300 and read like page caching that
// was never happening. The caching that does happen is on the data, in
// aggregateNewsCached.

// Fetches the default (unfiltered) view on the server so the very first HTML
// response contains real headlines instead of an empty shell — previously
// NewsDashboard ("use client") only ever fetched from an effect after
// hydration, so the initial render was always just loading skeletons: no LCP
// content, and non-JS crawlers/social scrapers saw a blank page. The client
// dashboard still owns filtering, search and live updates via SWR; this only
// seeds its first paint.
export default async function Page() {
  const initialData = await aggregateNewsCached(DEFAULT_NEWS_QUERY)
  return <NewsDashboard initialData={initialData} />
}
