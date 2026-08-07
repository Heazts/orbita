import { describe, expect, it } from "vitest"
import {
  UnsafeRemoteUrlError,
  isPrivateOrReservedIp,
  resolveRemoteImageUrl,
  validateRemoteImageUrl,
} from "@/lib/safe-remote-url"

describe("safe remote image URLs", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "2002:7f00:1::",
  ])("blocks private or reserved address %s", (address) => {
    expect(isPrivateOrReservedIp(address)).toBe(true)
  })

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])("allows public address %s", (address) => {
    expect(isPrivateOrReservedIp(address)).toBe(false)
  })

  it("accepts an HTTPS host that resolves only to public IPs", async () => {
    const url = await validateRemoteImageUrl("https://images.example.com/photo.jpg#fragment", async () => [
      "93.184.216.34",
    ])
    expect(url.toString()).toBe("https://images.example.com/photo.jpg")
  })

  it("returns a public address that can be pinned by the HTTPS client", async () => {
    const target = await resolveRemoteImageUrl("https://images.example.com/photo.jpg", async () => [
      "93.184.216.34",
    ])
    expect(target.address).toBe("93.184.216.34")
    expect(target.family).toBe(4)
  })

  it.each([
    "http://example.com/photo.jpg",
    "https://user:password@example.com/photo.jpg",
    "https://example.com:8443/photo.jpg",
    "https://localhost/photo.jpg",
    "https://metadata.google.internal/photo.jpg",
    "https://127.0.0.1/photo.jpg",
    "https://2130706433/photo.jpg",
  ])("rejects unsafe URL %s", async (value) => {
    await expect(validateRemoteImageUrl(value, async () => ["93.184.216.34"])).rejects.toThrow()
  })

  it("rejects a hostname when any resolved address is private", async () => {
    await expect(
      validateRemoteImageUrl("https://example.com/photo.jpg", async () => ["93.184.216.34", "10.0.0.1"]),
    ).rejects.toThrow("Endereço de rede não permitido")
  })
})

/**
 * The image route decides its status code from the error's type. It used to
 * regex the Portuguese message instead, so rewording any of these — or
 * translating the file — would have turned a 400 ("you sent a bad URL") into a
 * 504 ("we timed out"), blaming the wrong side.
 */
describe("rejections carry a type, not just a message", () => {
  const rejected = [
    ["não é uma URL", "sem esquema"],
    ["http://exemplo.com/a.jpg", "HTTP simples"],
    ["https://user:senha@exemplo.com/a.jpg", "credenciais embutidas"],
    ["https://exemplo.com:8443/a.jpg", "porta fora da 443"],
    ["https://localhost/a.jpg", "localhost"],
    ["https://algo.internal/a.jpg", "sufixo interno"],
    [`https://exemplo.com/${"a".repeat(3000)}.jpg`, "URL longa demais"],
  ] as const

  for (const [input, why] of rejected) {
    it(`rejeita ${why} com UnsafeRemoteUrlError`, async () => {
      await expect(resolveRemoteImageUrl(input)).rejects.toBeInstanceOf(UnsafeRemoteUrlError)
    })
  }

  it("também tipa o endereço privado resolvido por DNS", async () => {
    await expect(
      resolveRemoteImageUrl("https://exemplo.com/a.jpg", async () => ["127.0.0.1"]),
    ).rejects.toBeInstanceOf(UnsafeRemoteUrlError)
  })

  it("continua sendo um Error, para quem só faz catch genérico", async () => {
    await expect(resolveRemoteImageUrl("http://exemplo.com")).rejects.toBeInstanceOf(Error)
  })
})
