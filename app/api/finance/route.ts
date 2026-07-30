import { NextResponse } from "next/server"
import { fetchFinancialIndicators } from "@/lib/finance"

// Runs the external quote lookup server-side. The financial ticker used to call
// economia.awesomeapi.com.br directly from the browser, but the page's CSP sets
// connect-src 'self' — the browser silently blocked that fetch in production, so
// the widget always rendered FALLBACK_INDICATORS. Proxying through a same-origin
// route fixes the CSP conflict, keeps "no third-party requests from the browser"
// intact, and lets the response be cached like /api/news.
export const revalidate = 60

export async function GET() {
  const indicators = await fetchFinancialIndicators()
  return NextResponse.json(indicators, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  })
}
