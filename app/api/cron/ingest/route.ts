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
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      itemCount: result.items.length,
      sourceCount: result.sourceCount,
      failedSources: result.failedSources ?? [],
    })
  } catch (error) {
    console.error("[cron-ingest] failed", error instanceof Error ? error.name : "UnknownError")
    return NextResponse.json({ success: false, error: "Falha ao atualizar o cache" }, { status: 500 })
  }
}
