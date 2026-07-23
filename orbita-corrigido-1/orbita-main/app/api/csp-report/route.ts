import { NextRequest, NextResponse } from "next/server"
import { checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

// Receives Content-Security-Policy violation reports (configured in proxy.ts).
// Browsers send two shapes depending on the directive that triggered them:
//   - report-uri  → { "csp-report": {...} } with Content-Type application/csp-report
//   - report-to   → [ { type: "csp-violation", body: {...} }, ... ] with
//                    Content-Type application/reports+json
// We normalise both to a compact log line. This is a monitoring sink, not a
// data store: we never trust or echo the payload back to any client.

export const runtime = "nodejs"

// A CSP report is tiny; anything larger is abuse. Reject before parsing.
const MAX_REPORT_BYTES = 16_000

type CspBody = {
  "document-uri"?: string
  documentURL?: string
  "violated-directive"?: string
  effectiveDirective?: string
  "blocked-uri"?: string
  blockedURL?: string
}

// Report fields are attacker-controlled, so strip control characters and cap the
// length. \r and \n are listed explicitly (in addition to the \x00-\x1f range
// that already covers them) so static analysers recognise the newline-stripping
// as a log-forging barrier. Used per field and again at the log sink.
function stripForLog(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "unknown"
  const sanitized = value.replace(/[\r\n\x00-\x1f\x7f\x80-\x9f]+/g, " ").trim()
  return sanitized.length > maxLength ? sanitized.slice(0, maxLength) : sanitized || "unknown"
}

function summarise(body: CspBody): string {
  const directive = stripForLog(body["violated-directive"] ?? body.effectiveDirective, 256)
  const blocked = stripForLog(body["blocked-uri"] ?? body.blockedURL, 256)
  const documentUri = stripForLog(body["document-uri"] ?? body.documentURL, 256)
  return `directive=${directive} blocked=${blocked} document=${documentUri}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Prefixed so this endpoint doesn't share a rate-limit bucket with
  // /api/news — a browser legitimately reporting CSP violations shouldn't
  // eat into (or be eaten into by) that route's budget for the same IP.
  const rate = await checkRateLimitDistributed(`csp:${clientIp(request)}`)
  if (rate.limited) {
    return new NextResponse(null, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } })
  }

  const length = Number(request.headers.get("content-length") ?? 0)
  if (length > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  let payload: unknown
  try {
    const raw = await request.text()
    if (raw.length > MAX_REPORT_BYTES) return new NextResponse(null, { status: 413 })
    payload = JSON.parse(raw)
  } catch {
    // Malformed body — acknowledge without logging noise; the browser doesn't
    // act on the response anyway.
    return new NextResponse(null, { status: 204 })
  }

  // report-to delivers an array of reports; report-uri delivers a single object.
  const reports = Array.isArray(payload)
    ? payload.map((entry) => (entry as { body?: CspBody })?.body).filter(Boolean)
    : [(payload as { "csp-report"?: CspBody })["csp-report"]].filter(Boolean)

  for (const body of reports) {
    if (!body) continue
    const summary = stripForLog(summarise(body), 1024)
    // Defense in depth: stripForLog above already removes control characters,
    // including `\n` and `\r`. We check again here so static analysers and
    // runtime safeguards both see the log-forging barrier.
    const safeSummary = summary.replace(/[\r\n\x00-\x1f\x7f\x80-\x9f]+/g, " ").trim()
    if (!safeSummary || safeSummary !== summary) continue
    console.warn("[csp-violation] %s", safeSummary)
  }

  // 204: the reporting API ignores the body; a small empty response is enough.
  return new NextResponse(null, { status: 204 })
}

// CSP reports only ever arrive as POST; make other verbs explicit 405s.
export function GET(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } })
}
