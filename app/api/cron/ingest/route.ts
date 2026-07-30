import { NextRequest, NextResponse } from "next/server"
import { aggregateNews, DEFAULT_NEWS_QUERY } from "@/lib/aggregate"

export const revalidate = 0

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Secure cron endpoint if secret is configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Não autorizado", { status: 401 })
  }

  try {
    // Warm default homepage news cache
    const result = await aggregateNews(DEFAULT_NEWS_QUERY)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      itemCount: result.items.length,
      sourceCount: result.sourceCount,
      failedSources: result.failedSources ?? [],
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ success: false, error }, { status: 500 })
  }
}
