import { NextRequest, NextResponse } from "next/server"
import { REPORT_RATE_LIMIT, checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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
  // The body is already capped and sanitised, so what is left to bound is
  // volume: an unauthenticated endpoint that writes a log line per call is a
  // cheap way to run up log ingestion and bury real violations in noise.
  const rate = await checkRateLimitDistributed(clientIp(request), Date.now(), REPORT_RATE_LIMIT)
  // 429 rather than a silent 204: a browser that is being dropped should know.
  if (rate.limited) {
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfterSeconds) },
    })
  }

  const raw = await readCappedBody(request)
  if (raw === null) return new NextResponse(null, { status: 413 })

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  // `JSON.parse` yields any JSON value, including null and primitives. Indexing
  // those threw a TypeError that surfaced as a 500 on an unauthenticated
  // endpoint — a bare `null` body was enough. Anything that isn't a usable
  // shape is simply acknowledged with the same 204 as a well-formed report.
  const reports = (Array.isArray(payload)
    ? payload.map((entry) => (isRecord(entry) ? (entry.body as CspBody | undefined) : undefined))
    : [isRecord(payload) ? (payload["csp-report"] as CspBody | undefined) : undefined]
  )
    .filter((body): body is CspBody => isRecord(body))
    .slice(0, MAX_REPORTS_PER_REQUEST)

  for (const body of reports) {
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
