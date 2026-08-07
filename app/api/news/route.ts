import { NextRequest, NextResponse } from "next/server"
import { FEED_SOURCES, NEWS_CATEGORIES, plainText } from "@/lib/news"
import { aggregateNews } from "@/lib/aggregate"
import { NEWS_BUCKET, checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

export const revalidate = 300

export async function GET(request: NextRequest) {
  const clientId = clientIp(request)
  // Uses Upstash Redis for a cross-instance limit when configured, otherwise
  // falls back to the per-instance in-memory counter.
  const rate = await checkRateLimitDistributed(clientId, Date.now(), NEWS_BUCKET)
  const rateHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(NEWS_BUCKET.max),
    "X-RateLimit-Remaining": String(rate.remaining),
  }
  if (rate.limited) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { ...rateHeaders, "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }
  const params = request.nextUrl.searchParams
  const query = plainText(params.get("q") ?? "").slice(0, 120)
  const rawCategory = plainText(params.get("category") ?? "Todas")
  const category = NEWS_CATEGORIES.includes(rawCategory as typeof NEWS_CATEGORIES[number]) ? rawCategory : "Todas"
  const sourceNames = new Set(["Todas", ...FEED_SOURCES.map((s) => s.name)])
  const rawSource = plainText(params.get("source") ?? "Todas")
  const source = sourceNames.has(rawSource) ? rawSource : "Todas"
  const period = params.get("live") === "true" ? "live" : ["1", "7", "30"].includes(params.get("period") ?? "") ? Number(params.get("period")) : 0
  const sort = params.get("sort") === "relevance" ? "relevance" : "latest"

  const payload = await aggregateNews({ query, category, source, period, sort })

  // Live mode needs fresh data — skip the 5-minute CDN cache so the client's
  // 30-second SWR interval actually fetches new feed data.
  const cacheControl = period === "live"
    ? "private, no-cache, must-revalidate"
    : "public, s-maxage=300, stale-while-revalidate=600"
  return NextResponse.json(payload, {
    headers: { ...rateHeaders, "Cache-Control": cacheControl },
  })
}
