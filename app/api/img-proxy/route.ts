import { NextRequest, NextResponse } from "next/server"

const TIMEOUT_MS = 5_000

// Safe image content types allowed to be proxied
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
])

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url")
  if (!urlParam) {
    return new NextResponse("URL do parâmetro não informada", { status: 400 })
  }

  let targetUrl: URL
  try {
    targetUrl = new URL(urlParam)
  } catch {
    return new NextResponse("URL inválida", { status: 400 })
  }

  if (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") {
    return new NextResponse("Protocolo não suportado", { status: 400 })
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Orbita-MediaProxy/1.0 (+https://orbita.news)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "follow",
    })

    if (!res.ok) {
      return new NextResponse("Falha ao buscar imagem remota", { status: res.status })
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase().split(";")[0].trim()
    const finalMime = ALLOWED_MIME.has(contentType) ? contentType : "image/jpeg"

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": finalMime,
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    return new NextResponse("Tempo de requisição esgotado", { status: 504 })
  }
}
