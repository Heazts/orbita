import { NextRequest, NextResponse } from "next/server"
import { checkSourcesHealth } from "@/lib/health"
import { RATE_LIMIT_MAX_REQUESTS, checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

// Reads through the same 5-minute feed cache the pages use, so this endpoint
// adds no load on the outlets no matter how often it is polled, and reports the
// state readers are actually being served.
export const revalidate = 300

/**
 * Machine-readable status of every feed, for uptime monitoring.
 *
 * Returns 200 while at least one source works and 503 once every one of them is
 * down, so a monitor that only understands status codes still sees an outage.
 * A partial failure stays 200 with `status: "degraded"` — losing one outlet is
 * not the site being down, and paging on it would train whoever is on the other
 * end to ignore the alert.
 */
export async function GET(request: NextRequest) {
  const rate = await checkRateLimitDistributed(clientIp(request))
  if (rate.limited) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    )
  }

  const report = await checkSourcesHealth()

  if (report.status !== "ok") {
    // Structured so the platform's log search can find it. Source names only —
    // no URLs, no response bodies.
    console.error(
      "[health] sources degraded",
      JSON.stringify({
        status: report.status,
        down: report.sources.filter((source) => source.status === "down").map((source) => source.name),
        stale: report.sources.filter((source) => source.status === "stale").map((source) => source.name),
        emptyCategories: report.emptyCategories,
      }),
    )
  }

  return NextResponse.json(report, {
    status: report.status === "down" ? 503 : 200,
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  })
}
