import { NextRequest, NextResponse } from "next/server"
import { aggregateNews, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"
import { validBearerToken } from "@/lib/cron-auth"

export const runtime = "nodejs"
export const revalidate = 0

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ success: false, error: "Cron não configurado" }, { status: 503 })
  }

  if (!validBearerToken(request.headers.get("authorization"), cronSecret)) {
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
