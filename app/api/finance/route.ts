import { NextRequest, NextResponse } from "next/server"
import { fetchFinancialIndicators } from "@/lib/finance"
import { REPORT_RATE_LIMIT, checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

// Runs the external quote lookup server-side. The financial ticker used to call
// economia.awesomeapi.com.br directly from the browser, but the page's CSP sets
// connect-src 'self' — the browser silently blocked that fetch in production, so
// the widget always rendered FALLBACK_INDICATORS. Proxying through a same-origin
// route fixes the CSP conflict, keeps "no third-party requests from the browser"
// intact, and lets the response be cached like /api/news.
export const revalidate = 60

export async function GET(request: NextRequest) {
  // The 60s revalidate already bounds the outbound calls to the quote APIs, so
  // this only bounds the route itself.
  const rate = await checkRateLimitDistributed(clientIp(request), Date.now(), REPORT_RATE_LIMIT)
  if (rate.limited) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }

  const indicators = await fetchFinancialIndicators()
  return NextResponse.json(indicators, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  })
}
