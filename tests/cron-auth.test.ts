import { describe, expect, it } from "vitest"
import { validBearerToken } from "@/lib/cron-auth"

describe("cron authentication", () => {
  it("accepts the exact bearer token", () => {
    expect(validBearerToken("Bearer secret-value", "secret-value")).toBe(true)
  })

  it.each([null, "", "secret-value", "Bearer wrong", "bearer secret-value"])(
    "rejects an invalid authorization header",
    (header) => {
      expect(validBearerToken(header, "secret-value")).toBe(false)
    },
  )
})
