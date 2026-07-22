// Content-Security-Policy is set in middleware.ts instead of here: it needs a
// fresh nonce per request for script-src, which headers() can't generate.

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework via X-Powered-By.
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Not Cross-Origin-Embedder-Policy: this app intentionally loads <img>
          // from arbitrary third-party feed domains, which don't send CORP/CORS
          // headers, so COEP would break article thumbnails.
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
