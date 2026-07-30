export type Trend = "up" | "down" | "flat"

export type FinancialIndicator = {
  symbol: string
  name: string
  price: string
  change: string
  trend: Trend
  // Where the figure came from and what date it refers to. Shown in the UI so
  // a reader can tell a live FX quote from a monthly inflation print.
  note: string
}

const CURRENCY_ENDPOINT = "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL"
const BCB_SERIES = "https://api.bcb.gov.br/dados/serie/bcdata.sgs"
const TIMEOUT_MS = 5_000

function trendOf(delta: number): Trend {
  if (delta > 0) return "up"
  if (delta < 0) return "down"
  return "flat"
}

function signed(value: number, digits = 2): string {
  const fixed = Math.abs(value).toFixed(digits).replace(".", ",")
  if (value > 0) return `+${fixed}`
  if (value < 0) return `-${fixed}`
  return `0,${"0".repeat(digits)}`
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 60 },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

type Quote = { bid: string; pctChange: string }

function currencyIndicator(
  quote: Quote | undefined,
  symbol: string,
  name: string,
  format: (value: number) => string,
): FinancialIndicator | null {
  if (!quote) return null
  const bid = Number.parseFloat(quote.bid)
  const pct = Number.parseFloat(quote.pctChange)
  if (!Number.isFinite(bid) || !Number.isFinite(pct)) return null
  return {
    symbol,
    name,
    price: format(bid),
    change: `${signed(pct)}%`,
    trend: trendOf(pct),
    note: "AwesomeAPI · cotação do dia",
  }
}

type SeriesPoint = { data: string; valor: string }

// Banco Central's SGS service. Each series is a single economic indicator;
// asking for the last two points lets us show the change since the previous
// reading (a Copom decision, a monthly inflation print) instead of a bare
// number with no direction.
async function bcbIndicator(
  seriesId: number,
  symbol: string,
  name: string,
  // Inflation falling is good news, a rising policy rate is restrictive —
  // "up" here means "the number went up", the UI does not editorialize.
): Promise<FinancialIndicator | null> {
  const points = await getJson<SeriesPoint[]>(`${BCB_SERIES}.${seriesId}/dados/ultimos/2?formato=json`)
  if (!Array.isArray(points) || points.length === 0) return null
  const latest = points[points.length - 1]
  const previous = points.length > 1 ? points[points.length - 2] : undefined
  const value = Number.parseFloat(latest.valor)
  if (!Number.isFinite(value)) return null
  const previousValue = previous ? Number.parseFloat(previous.valor) : NaN
  const delta = Number.isFinite(previousValue) ? value - previousValue : 0
  return {
    symbol,
    name,
    price: `${value.toFixed(2).replace(".", ",")}%`,
    change: `${signed(delta)} p.p.`,
    trend: trendOf(delta),
    note: `Banco Central · ${latest.data}`,
  }
}

/**
 * Real market and macro data only. Every figure is fetched from a public
 * source and carries the date it refers to — nothing is hardcoded.
 *
 * Indicators whose source is unreachable are simply omitted rather than
 * replaced with a stale constant: showing an invented SELIC under a heading
 * that says "tempo real" is worse than showing one row fewer.
 */
export async function fetchFinancialIndicators(): Promise<FinancialIndicator[]> {
  const [currencies, selic, cdi, ipca] = await Promise.all([
    getJson<Record<string, Quote>>(CURRENCY_ENDPOINT),
    bcbIndicator(432, "SELIC", "Selic (meta)"),
    bcbIndicator(4389, "CDI", "CDI (a.a.)"),
    bcbIndicator(13522, "IPCA", "IPCA (12m)"),
  ])

  const brl = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`

  return [
    currencyIndicator(currencies?.USDBRL, "USD/BRL", "Dólar", brl),
    currencyIndicator(currencies?.EURBRL, "EUR/BRL", "Euro", brl),
    currencyIndicator(currencies?.BTCBRL, "BTC/BRL", "Bitcoin", (value) =>
      `R$ ${Math.round(value).toLocaleString("pt-BR")}`,
    ),
    selic,
    cdi,
    ipca,
  ].filter((indicator): indicator is FinancialIndicator => indicator !== null)
}
