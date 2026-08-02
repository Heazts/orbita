import { NextRequest, NextResponse } from "next/server"

const isDev = process.env.NODE_ENV !== "production"

// Where browsers POST CSP violation reports. Handled by app/api/csp-report.
const CSP_REPORT_PATH = "/api/csp-report"
const CSP_REPORT_GROUP = "csp-endpoint"

// 'unsafe-eval' and ws: are only needed for Next's dev server (Turbopack HMR);
// production builds don't use eval. The nonce lets the inline theme-detection
// and JSON-LD scripts in app/layout.tsx run without 'unsafe-inline'.
//
// Vercel Analytics and Speed Insights serve their scripts from /_vercel/… in
// production — same origin, covered by 'self', no third-party host in the
// production policy. Only in development do they fall back to the debug bundle
// on va.vercel-scripts.com, so that host is allowed there and nowhere else.
// Without it the dev console fills with CSP violations that are not real
// problems, which is how people learn to ignore CSP violations that are.
const DEV_ANALYTICS_HOST = "https://va.vercel-scripts.com"

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? ` 'unsafe-eval' ${DEV_ANALYTICS_HOST}` : ""}`,
    "style-src 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    // The service worker (public/sw.js) and the PWA manifest are same-origin.
    "worker-src 'self'",
    "manifest-src 'self'",
    // Explicitly forbid plugins and any framing/child browsing contexts. These
    // fall back to default-src 'self' already, but scanners flag their absence
    // and 'none' is stricter than the 'self' fallback.
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Report violations so we can catch regressions in production. report-to is
    // the modern directive (paired with the Reporting-Endpoints header below);
    // report-uri is the legacy fallback still honoured by older browsers.
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
    // Defence in depth: force any accidental http subresource to https. Skipped
    // in dev so a plain-http localhost/LAN dev server keeps working.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ")
}

export function proxy(request: NextRequest) {
  // btoa, not Buffer: the proxy runs on the Edge runtime, which has no Node
  // Buffer global.
  const nonce = btoa(crypto.randomUUID())
  const csp = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  // Names the report-to group used in the CSP above. Same-origin endpoint, so
  // reports are delivered without a preflight.
  response.headers.set("Reporting-Endpoints", `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`)
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
