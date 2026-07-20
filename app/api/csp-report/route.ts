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

function summarise(body: CspBody): string {
  const directive = body["violated-directive"] ?? body.effectiveDirective ?? "unknown-directive"
  const blocked = body["blocked-uri"] ?? body.blockedURL ?? "unknown"
  const document = body["document-uri"] ?? body.documentURL ?? "unknown"
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
    if (body) console.warn(`[csp-violation] ${summarise(body)}`)
  }

  // 204: the reporting API ignores the body; a small empty response is enough.
  return new NextResponse(null, { status: 204 })
}

// CSP reports only ever arrive as POST; make other verbs explicit 405s.
export function GET(): NextResponse {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } })
}
