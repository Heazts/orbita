import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const MAX_REPORT_BYTES = 16_000
const MAX_REPORTS_PER_REQUEST = 20

type CspBody = {
  "document-uri"?: string
  documentURL?: string
  "violated-directive"?: string
  effectiveDirective?: string
  "blocked-uri"?: string
  blockedURL?: string
}

function sanitize(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "unknown"
  const noNewlines = value.replace(/[\r\n]/g, "")
  const sanitized = noNewlines.replace(/[^\x20-\x7e]/g, "_").trim()
  return sanitized.length > maxLength ? sanitized.slice(0, maxLength) : sanitized || "unknown"
}

async function readCappedBody(request: NextRequest): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BYTES) return null

  const reader = request.body?.getReader()
  if (!reader) return ""

  const decoder = new TextDecoder()
  let text = ""
  let total = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_REPORT_BYTES) {
      await reader.cancel()
      return null
    }
    text += decoder.decode(value, { stream: true })
  }

  return text + decoder.decode()
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const raw = await readCappedBody(request)
  if (raw === null) return new NextResponse(null, { status: 413 })

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const reports = (Array.isArray(payload)
    ? payload.map((entry) => (entry as { body?: CspBody })?.body).filter(Boolean)
    : [(payload as { "csp-report"?: CspBody })["csp-report"]].filter(Boolean)
  ).slice(0, MAX_REPORTS_PER_REQUEST)

  for (const body of reports) {
    if (!body) continue
    const directive = sanitize(body["violated-directive"] ?? body.effectiveDirective, 256)
    const blocked = sanitize(body["blocked-uri"] ?? body.blockedURL, 256)
    const documentUri = sanitize(body["document-uri"] ?? body.documentURL, 256)
    console.warn("[csp-violation] directive=%s blocked=%s document=%s", directive, blocked, documentUri)
  }

  return new NextResponse(null, { status: 204 })
}

export function GET(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } })
}
