import { EventEmitter } from "node:events"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  httpsRequest: vi.fn(),
  resolveRemoteImageUrl: vi.fn(),
}))

vi.mock("node:https", () => ({ request: mocks.httpsRequest }))
vi.mock("@/lib/safe-remote-url", () => ({ resolveRemoteImageUrl: mocks.resolveRemoteImageUrl }))

import { GET } from "@/app/api/img-proxy/route"
import { createImageProxyUrl } from "@/lib/image-proxy-signature"
import { resetRateLimit } from "@/lib/rate-limit"

type FakeResponse = EventEmitter & {
  statusCode: number
  headers: Record<string, string>
  destroy: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
}

function fakeResponse(statusCode: number, headers: Record<string, string> = {}): FakeResponse {
  return Object.assign(new EventEmitter(), {
    statusCode,
    headers,
    destroy: vi.fn(),
    resume: vi.fn(),
  })
}

function serve(response: FakeResponse, afterHeaders?: () => void) {
  return (_options: unknown, callback: (value: FakeResponse) => void) => {
    const request = Object.assign(new EventEmitter(), {
      setTimeout: vi.fn(),
      end: vi.fn(() => {
        callback(response)
        afterHeaders?.()
      }),
    })
    return request
  }
}

function requestFor(url: string): NextRequest {
  const path = createImageProxyUrl(url)
  if (!path) throw new Error("test signing secret is missing")
  return new NextRequest(`https://orbita.news${path}`, { headers: { "x-real-ip": "203.0.113.70" } })
}

beforeEach(() => {
  vi.stubEnv("IMAGE_PROXY_SECRET", "test-image-secret")
  resetRateLimit()
  mocks.httpsRequest.mockReset()
  mocks.resolveRemoteImageUrl.mockReset()
  mocks.resolveRemoteImageUrl.mockImplementation(async (url: string) => ({
    url: new URL(url),
    address: "93.184.216.34",
    family: 4,
  }))
})

afterEach(() => {
  vi.unstubAllEnvs()
  resetRateLimit()
})

describe("image proxy response disposal", () => {
  it("destroys a rejected response instead of draining an unbounded body", async () => {
    const rejected = fakeResponse(404)
    mocks.httpsRequest.mockImplementation(serve(rejected))

    expect((await GET(requestFor("https://images.example.com/not-found.jpg"))).status).toBe(502)
    expect(rejected.destroy).toHaveBeenCalledOnce()
    expect(rejected.resume).not.toHaveBeenCalled()
  })

  it("destroys a redirect response before following the validated Location", async () => {
    const redirect = fakeResponse(302, { location: "/final.jpg" })
    const image = fakeResponse(200, { "content-type": "image/jpeg", "content-length": "3" })
    mocks.httpsRequest
      .mockImplementationOnce(serve(redirect))
      .mockImplementationOnce(serve(image, () => {
        image.emit("data", Buffer.from([1, 2, 3]))
        image.emit("end")
      }))

    expect((await GET(requestFor("https://images.example.com/start.jpg"))).status).toBe(200)
    expect(redirect.destroy).toHaveBeenCalledOnce()
    expect(redirect.resume).not.toHaveBeenCalled()
    expect(mocks.httpsRequest).toHaveBeenCalledTimes(2)
  })
})
