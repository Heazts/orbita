import type { IncomingHttpHeaders } from "node:http"
import { request as httpsRequest } from "node:https"
import { isIP } from "node:net"
import { NextRequest, NextResponse } from "next/server"
import {
  UnsafeRemoteUrlError,
  resolveRemoteImageUrl,
  type ResolvedRemoteUrl,
} from "@/lib/safe-remote-url"
import { IMAGE_RATE_LIMIT, checkRateLimitDistributed, clientIp } from "@/lib/rate-limit"

export const runtime = "nodejs"

const TIMEOUT_MS = 5_000
const MAX_IMAGE_BYTES = 8_000_000
const MAX_REDIRECTS = 3

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
])

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

class ImageTooLargeError extends Error {
  constructor() {
    super("Imagem muito grande")
    this.name = "ImageTooLargeError"
  }
}

class UnsupportedImageError extends Error {
  constructor() {
    super("Formato de imagem não permitido")
    this.name = "UnsupportedImageError"
  }
}

class RemoteImageStatusError extends Error {
  constructor() {
    super("Falha ao buscar imagem remota")
    this.name = "RemoteImageStatusError"
  }
}

type RemoteResult =
  | { kind: "redirect"; location: string }
  | { kind: "image"; contentType: string; buffer: Buffer }

function requestPinnedImage(target: ResolvedRemoteUrl): Promise<RemoteResult> {
  return new Promise((resolve, reject) => {
    const originalHostname = target.url.hostname.replace(/^\[|\]$/g, "")
    const request = httpsRequest(
      {
        protocol: "https:",
        // Connect to the exact public address that passed validation rather
        // than passing the user-supplied URL to the network sink. Host and SNI
        // preserve virtual hosting and TLS verification for the original name.
        hostname: target.address,
        family: target.family,
        port: 443,
        path: `${target.url.pathname}${target.url.search}`,
        servername: isIP(originalHostname) ? undefined : originalHostname,
        method: "GET",
        headers: {
          Host: target.url.host,
          "User-Agent": "Orbita-MediaProxy/1.2 (+https://orbita.news)",
          Accept: "image/avif,image/webp,image/apng,image/*;q=0.8",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
      (response) => {
        const statusCode = response.statusCode ?? 502
        if (REDIRECT_STATUSES.has(statusCode)) {
          const location = response.headers.location
          response.resume()
          if (!location) {
            reject(new RemoteImageStatusError())
            return
          }
          resolve({ kind: "redirect", location })
          return
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume()
          reject(new RemoteImageStatusError())
          return
        }

        const contentType = parseContentType(response.headers)
        if (!ALLOWED_MIME.has(contentType)) {
          response.resume()
          reject(new UnsupportedImageError())
          return
        }

        const declaredLength = Number(response.headers["content-length"] ?? 0)
        if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
          response.resume()
          reject(new ImageTooLargeError())
          return
        }

        const chunks: Buffer[] = []
        let total = 0
        response.on("data", (chunk: Buffer) => {
          total += chunk.byteLength
          if (total > MAX_IMAGE_BYTES) {
            response.destroy(new ImageTooLargeError())
            return
          }
          chunks.push(chunk)
        })
        response.on("end", () => resolve({ kind: "image", contentType, buffer: Buffer.concat(chunks, total) }))
        response.on("error", reject)
      },
    )

    request.setTimeout(TIMEOUT_MS, () => request.destroy(new Error("Tempo de requisição esgotado")))
    request.on("error", reject)
    request.end()
  })
}

function parseContentType(headers: IncomingHttpHeaders): string {
  const value = headers["content-type"]
  const contentType = Array.isArray(value) ? value[0] : value
  return (contentType ?? "").toLowerCase().split(";")[0].trim()
}

async function fetchWithSafeRedirects(initialUrl: string): Promise<{ contentType: string; buffer: Buffer }> {
  let target = await resolveRemoteImageUrl(initialUrl)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const result = await requestPinnedImage(target)
    if (result.kind === "image") return result
    if (redirects === MAX_REDIRECTS) throw new RemoteImageStatusError()
    target = await resolveRemoteImageUrl(new URL(result.location, target.url).toString())
  }

  throw new RemoteImageStatusError()
}

export async function GET(request: NextRequest) {
  // Without this the route is an open outbound fetcher: any caller could make
  // the server pull up to MAX_IMAGE_BYTES from any public HTTPS host, as often
  // as they liked, with each distinct URL becoming its own week-long CDN entry.
  // The budget is separate from the news one and sized from a real measurement
  // — see IMAGE_RATE_LIMIT.
  const rate = await checkRateLimitDistributed(clientIp(request), Date.now(), IMAGE_RATE_LIMIT)
  if (rate.limited) {
    return new NextResponse("Muitas requisições de imagem", {
      status: 429,
      headers: {
        "Retry-After": String(rate.retryAfterSeconds),
        "X-RateLimit-Limit": String(IMAGE_RATE_LIMIT.max),
        "X-RateLimit-Remaining": "0",
      },
    })
  }

  const urlParam = request.nextUrl.searchParams.get("url")
  if (!urlParam) return new NextResponse("Parâmetro URL não informado", { status: 400 })

  try {
    const { buffer, contentType } = await fetchWithSafeRedirects(urlParam)
    // NextResponse's BodyInit type accepts a web Uint8Array, while Node's
    // Buffer may be backed by a SharedArrayBuffer under newer @types/node.
    return new NextResponse(Uint8Array.from(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    if (error instanceof ImageTooLargeError) return new NextResponse("Imagem muito grande", { status: 413 })
    if (error instanceof UnsupportedImageError) {
      return new NextResponse("Formato de imagem não permitido", { status: 415 })
    }
    if (error instanceof RemoteImageStatusError) {
      return new NextResponse("Falha ao buscar imagem remota", { status: 502 })
    }
    // Matched on the type, not on the wording: this used to test the message
    // against /URL|HTTPS|Host|Porta|Credenciais|Endereço/, so rewording one of
    // those errors would have quietly turned a 400 into a 504.
    if (error instanceof UnsafeRemoteUrlError) {
      return new NextResponse("URL remota não permitida", { status: 400 })
    }
    return new NextResponse("Não foi possível buscar a imagem", { status: 504 })
  }
}
