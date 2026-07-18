import { NextRequest, NextResponse } from "next/server"

const isDev = process.env.NODE_ENV !== "production"

// 'unsafe-eval' and ws: are only needed for Next's dev server (Turbopack HMR);
// production builds don't use eval. The nonce lets the inline theme-detection
// and JSON-LD scripts in app/layout.tsx run without 'unsafe-inline'.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self'",
    "img-src 'self' https: data:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
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
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
}
