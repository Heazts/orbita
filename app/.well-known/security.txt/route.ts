import { SITE_URL } from "@/lib/site"

// RFC 9116 security.txt: a machine-readable pointer to the project's disclosure
// process, mirroring SECURITY.md. Served from /.well-known/security.txt.
export const dynamic = "force-static"
export const revalidate = 86_400

export function GET(): Response {
  // Expires is required by RFC 9116. Keep it ~1 year out; regenerated on each
  // static revalidation so it never goes stale.
  const expires = new Date(Date.now() + 365 * 86_400_000).toISOString()
  const body = [
    "Contact: https://github.com/Heazts/orbita/security/advisories/new",
    `Expires: ${expires}`,
    "Preferred-Languages: pt-BR, en",
    "Policy: https://github.com/Heazts/orbita/blob/main/SECURITY.md",
    `Canonical: ${SITE_URL}/.well-known/security.txt`,
    "",
  ].join("\n")
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
