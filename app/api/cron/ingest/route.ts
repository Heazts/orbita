import { NextRequest, NextResponse } from "next/server"
import { aggregateNews, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"
import { validBearerToken } from "@/lib/cron-auth"

export const runtime = "nodejs"
export const revalidate = 0

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  // Authenticate first, and answer a missing secret exactly like a wrong one.
  // Reporting "Cron não configurado" before checking the token told any
  // anonymous caller whether this deployment has CRON_SECRET set, which is a
  // deployment detail they have no reason to learn. Still fails closed: with no
  // secret, validBearerToken can never return true.
  if (!cronSecret || !validBearerToken(request.headers.get("authorization"), cronSecret)) {
    // A missing secret is an operator mistake, not a caller's, and it means this
    // job has silently done nothing since deploy. Log it where the platform's
    // alerting can see it — the same channel the failed-source report uses.
    if (!cronSecret) console.error("[cron-ingest] CRON_SECRET is not configured; ingest cannot run")
    return new NextResponse("Não autorizado", { status: 401 })
  }

  try {
    const result = await aggregateNews(DEFAULT_NEWS_QUERY)
    const failedSources = result.failedSources ?? []

    // This ran every few minutes with the failures already in hand and reported
    // them only in a response body nobody reads, so a feed could stay dead
    // indefinitely. Logging at error level puts it where the platform's alerting
    // can see it; /api/health is the same picture on demand.
    if (failedSources.length > 0) {
      console.error(
        "[cron-ingest] sources failed",
        JSON.stringify({ failedSources, itemCount: result.items.length }),
      )
    }

    return NextResponse.json({
      success: true,
      // Warm cache with no news in it means the run did not do its job, even
      // though every individual step "worked".
      degraded: failedSources.length > 0 || result.items.length === 0,
      timestamp: new Date().toISOString(),
      itemCount: result.items.length,
      sourceCount: result.sourceCount,
      failedSources,
    })
  } catch (error) {
    console.error("[cron-ingest] failed", error instanceof Error ? error.name : "UnknownError")
    return NextResponse.json({ success: false, error: "Falha ao atualizar o cache" }, { status: 500 })
  }
}
