import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchFinancialIndicators } from "@/lib/finance"

const currencyPayload = {
  USDBRL: { bid: "5.1414", pctChange: "0.085651" },
  EURBRL: { bid: "5.8532", pctChange: "-0.21" },
  BTCBRL: { bid: "329085.12", pctChange: "1.4" },
}

const seriesPayload = [
  { data: "01/05/2026", valor: "4.72" },
  { data: "01/06/2026", valor: "4.64" },
]

function mockFetch(handler: (url: string) => unknown | null) {
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = String(input)
    const body = handler(url)
    if (body === null) return new Response(null, { status: 503 })
    return new Response(JSON.stringify(body), { status: 200 })
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("fetchFinancialIndicators", () => {
  it("returns real currency and Banco Central indicators", async () => {
    mockFetch((url) => (url.includes("awesomeapi") ? currencyPayload : seriesPayload))

    const indicators = await fetchFinancialIndicators()
    const symbols = indicators.map((item) => item.symbol)
    expect(symbols).toEqual(["USD/BRL", "EUR/BRL", "BTC/BRL", "SELIC", "CDI", "IPCA"])

    const usd = indicators.find((item) => item.symbol === "USD/BRL")
    expect(usd?.price).toBe("R$ 5,14")
    expect(usd?.trend).toBe("up")
    expect(usd?.change).toBe("+0,09%")

    const eur = indicators.find((item) => item.symbol === "EUR/BRL")
    expect(eur?.trend).toBe("down")
    expect(eur?.change).toBe("-0,21%")
  })

  it("computes the change between the last two Banco Central readings", async () => {
    mockFetch((url) => (url.includes("awesomeapi") ? currencyPayload : seriesPayload))

    const indicators = await fetchFinancialIndicators()
    const ipca = indicators.find((item) => item.symbol === "IPCA")
    // 4.64 latest vs 4.72 previous → fell 0.08 percentage points.
    expect(ipca?.price).toBe("4,64%")
    expect(ipca?.change).toBe("-0,08 p.p.")
    expect(ipca?.trend).toBe("down")
    expect(ipca?.note).toContain("Banco Central")
  })

  it("omits indicators whose source is unavailable instead of inventing values", async () => {
    // Currencies resolve, every Banco Central series fails.
    mockFetch((url) => (url.includes("awesomeapi") ? currencyPayload : null))

    const indicators = await fetchFinancialIndicators()
    expect(indicators.map((item) => item.symbol)).toEqual(["USD/BRL", "EUR/BRL", "BTC/BRL"])
  })

  it("returns an empty list when every source fails, never stale constants", async () => {
    mockFetch(() => null)
    expect(await fetchFinancialIndicators()).toEqual([])
  })
})
