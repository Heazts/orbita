import { lookup } from "node:dns/promises"
import { isIP } from "node:net"

const MAX_URL_LENGTH = 2_048
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"]

export type HostResolver = (hostname: string) => Promise<string[]>

export type ResolvedRemoteUrl = {
  url: URL
  address: string
  family: 4 | 6
}

async function resolveHostname(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  return addresses.map(({ address }) => address)
}

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0]
}

function blockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true
  }

  const [a, b, c] = octets
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  )
}

function expandIpv6(address: string): number[] | null {
  let normalized = normalizeAddress(address)
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":")
    if (lastColon < 0) return null
    const ipv4 = normalized.slice(lastColon + 1)
    const octets = ipv4.split(".").map(Number)
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      return null
    }
    const high = ((octets[0] << 8) | octets[1]).toString(16)
    const low = ((octets[2] << 8) | octets[3]).toString(16)
    normalized = `${normalized.slice(0, lastColon)}:${high}:${low}`
  }

  const halves = normalized.split("::")
  if (halves.length > 2) return null
  const parseHalf = (value: string): number[] | null => {
    if (!value) return []
    const parts = value.split(":")
    if (parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null
    return parts.map((part) => Number.parseInt(part, 16))
  }

  const left = parseHalf(halves[0])
  const right = parseHalf(halves[1] ?? "")
  if (!left || !right) return null

  if (halves.length === 1) return left.length === 8 ? left : null
  const missing = 8 - left.length - right.length
  if (missing < 1) return null
  return [...left, ...Array<number>(missing).fill(0), ...right]
}

function blockedIpv6(address: string): boolean {
  const parts = expandIpv6(address)
  if (!parts) return true
  const [a, b, c, d, e, f, g, h] = parts

  const isUnspecified = parts.every((part) => part === 0)
  const isLoopback = parts.slice(0, 7).every((part) => part === 0) && h === 1
  if (isUnspecified || isLoopback) return true

  // IPv4-compatible/mapped IPv6 forms can otherwise disguise loopback,
  // link-local or RFC1918 addresses in the final 32 bits.
  const firstFiveZero = a === 0 && b === 0 && c === 0 && d === 0 && e === 0
  if (firstFiveZero && (f === 0 || f === 0xffff)) {
    const mapped = `${g >> 8}.${g & 0xff}.${h >> 8}.${h & 0xff}`
    return blockedIpv4(mapped)
  }

  return (
    (a & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (a & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (a & 0xffc0) === 0xfec0 || // deprecated site-local fec0::/10
    (a & 0xff00) === 0xff00 || // multicast ff00::/8
    (a === 0x0064 && b === 0xff9b) || // NAT64 translation prefixes
    (a === 0x0100 && b === 0 && c === 0 && d === 0) || // discard-only 100::/64
    (a === 0x2001 && b === 0x0002) || // benchmarking 2001:2::/48
    (a === 0x2001 && b === 0x0db8) || // documentation 2001:db8::/32
    (a === 0x2001 && (b & 0xfff0) === 0x0010) || // ORCHID 2001:10::/28
    (a === 0x2001 && (b & 0xfff0) === 0x0020) || // ORCHIDv2 2001:20::/28
    a === 0x2002 // 6to4 can embed a private IPv4 destination
  )
}

export function isPrivateOrReservedIp(address: string): boolean {
  const normalized = normalizeAddress(address)
  const version = isIP(normalized)
  if (version === 4) return blockedIpv4(normalized)
  if (version === 6) return blockedIpv6(normalized)
  return true
}

export async function resolveRemoteImageUrl(
  input: string,
  resolver: HostResolver = resolveHostname,
): Promise<ResolvedRemoteUrl> {
  if (!input || input.length > MAX_URL_LENGTH) throw new Error("URL inválida")

  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error("URL inválida")
  }

  if (url.protocol !== "https:") throw new Error("Apenas HTTPS é permitido")
  if (url.username || url.password) throw new Error("Credenciais na URL não são permitidas")
  if (url.port && url.port !== "443") throw new Error("Porta não permitida")

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase()
  if (
    !hostname ||
    hostname === "localhost" ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    throw new Error("Host não permitido")
  }

  const addresses = isIP(hostname) ? [hostname] : await resolver(hostname)
  const normalizedAddresses = addresses.map(normalizeAddress)
  if (normalizedAddresses.length === 0 || normalizedAddresses.some(isPrivateOrReservedIp)) {
    throw new Error("Endereço de rede não permitido")
  }

  const address = normalizedAddresses[0]
  const family = isIP(address)
  if (family !== 4 && family !== 6) throw new Error("Endereço de rede inválido")

  url.hash = ""
  return { url, address, family }
}

export async function validateRemoteImageUrl(
  input: string,
  resolver: HostResolver = resolveHostname,
): Promise<URL> {
  return (await resolveRemoteImageUrl(input, resolver)).url
}
