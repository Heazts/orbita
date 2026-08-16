const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

type NextFetchInit = RequestInit & {
  next?: { revalidate?: number }
}

function assertSafeOrigin(url: URL, expectedOrigin: string): void {
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.origin !== expectedOrigin
  ) {
    throw new Error("Redirect remoto não permitido")
  }
}

/**
 * Follow the small redirects used by fixed upstream APIs without inheriting
 * trust from the initial host to an arbitrary Location target. Restricting all
 * hops to the original HTTPS origin closes redirect-based SSRF without a DNS
 * validation/fetch race and preserves ordinary path canonicalization.
 */
export async function fetchSameOrigin(
  input: string | URL,
  init: NextFetchInit = {},
  maxRedirects = 3,
): Promise<Response> {
  const initial = new URL(input)
  assertSafeOrigin(initial, initial.origin)
  let current = initial

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetch(current, { ...init, redirect: "manual" })
    if (!REDIRECT_STATUSES.has(response.status)) return response

    const location = response.headers.get("location")
    await response.body?.cancel()
    if (!location || redirects === maxRedirects) throw new Error("Redirect remoto não permitido")

    const next = new URL(location, current)
    assertSafeOrigin(next, initial.origin)
    current = next
  }

  throw new Error("Redirect remoto não permitido")
}
