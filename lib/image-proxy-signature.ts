import { createHmac, timingSafeEqual } from "node:crypto"

const SIGNATURE_CONTEXT = "orbita-image-proxy-v1"

function signingSecret(): string | null {
  const dedicated = process.env.IMAGE_PROXY_SECRET?.trim()
  if (dedicated) return dedicated
  return process.env.CRON_SECRET?.trim() || null
}

function signatureFor(url: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(SIGNATURE_CONTEXT)
    .update("\0")
    .update(url)
    .digest("base64url")
}

export function createImageProxyUrl(url: string): string | null {
  const secret = signingSecret()
  if (!secret || !/^https:\/\//i.test(url)) return null
  const signature = signatureFor(url, secret)
  return `/api/img-proxy?url=${encodeURIComponent(url)}&sig=${encodeURIComponent(signature)}`
}

export function verifyImageProxySignature(url: string, supplied: string | null): boolean {
  const secret = signingSecret()
  if (!secret || !supplied) return false
  const expected = Buffer.from(signatureFor(url, secret))
  const candidate = Buffer.from(supplied)
  return expected.length === candidate.length && timingSafeEqual(expected, candidate)
}
