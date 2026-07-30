import { timingSafeEqual } from "node:crypto"

export function validBearerToken(header: string | null, secret: string): boolean {
  if (!header || !secret) return false
  const actual = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
