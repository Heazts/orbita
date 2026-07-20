import { NextRequest, NextResponse } from "next/server"

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

// Report fields are attacker-controlled, so strip control characters (CR/LF and
// friends, which could forge log lines) and cap the length before logging.
function sanitiseField(value: unknown): string {
  if (typeof value !== "string") return "unknown"
  return value.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 256) || "unknown"
}

// Defence in depth: sanitise the final log message at the sink boundary.
function sanitiseLogMessage(value: string): string {
  return value.replace(/[\x00-\x1f\x7f]+/g, " ").trim().slice(0, 1024)
}

function summarise(body: CspBody): string {
  const directive = sanitiseField(body["violated-directive"] ?? body.effectiveDirective)
  const blocked = sanitiseField(body["blocked-uri"] ?? body.blockedURL)
  const document = sanitiseField(body["document-uri"] ?? body.documentURL)
  return `directive=${directive} blocked=${blocked} document=${document}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    if (body) console.warn(`[csp-violation] ${sanitiseLogMessage(summarise(body))}`)
  }

  // 204: the reporting API ignores the body; a small empty response is enough.
  return new NextResponse(null, { status: 204 })
}

// CSP reports only ever arrive as POST; make other verbs explicit 405s.
export function GET(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } })
}
