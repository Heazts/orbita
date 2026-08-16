import { readFileSync, readdirSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { FEED_SOURCES } from "@/lib/news"
import { IMAGE_BUCKET, NEWS_BUCKET, RATE_LIMIT_MAX_REQUESTS } from "@/lib/rate-limit"

/**
 * The privacy page makes factual claims about what the site does. Those claims
 * drift silently: nothing breaks when the code stops matching the text, and the
 * only person who finds out is a reader who was told something untrue.
 *
 * Three claims had already drifted when this file was written:
 *
 *  - "Usamos o Vercel Analytics" — the package was not installed and nothing
 *    rendered it. The site claimed to collect metrics it did not collect.
 *  - "BBC, DW, Agência Brasil…" — DW is not, and was not, a source.
 *  - "As imagens são carregadas diretamente dos servidores dessas fontes" —
 *    the opposite of what happens. Every remote image goes through
 *    /api/img-proxy, so the outlets never see the reader's IP. The page
 *    understated its own protection while stating something false.
 */
const privacy = readFileSync(new URL("../app/privacidade/page.tsx", import.meta.url), "utf8")
const terms = readFileSync(new URL("../app/termos/page.tsx", import.meta.url), "utf8")
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
const newsImage = readFileSync(new URL("../components/ui/news-image.tsx", import.meta.url), "utf8")
const aggregateSource = readFileSync(new URL("../lib/aggregate.ts", import.meta.url), "utf8")
const imageProxySignature = readFileSync(new URL("../lib/image-proxy-signature.ts", import.meta.url), "utf8")
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
const rateLimitSource = readFileSync(new URL("../lib/rate-limit.ts", import.meta.url), "utf8")

describe("privacy page claims match the code", () => {
  it("only names outlets that are actually sources", () => {
    // Names the page uses as examples of where content comes from.
    const claimed = ["BBC Brasil", "Agência Brasil", "G1", "InfoMoney", "NASA"]
    for (const name of claimed) {
      expect(privacy).toContain(name)
      const isSource = FEED_SOURCES.some((source) => source.name.includes(name))
      expect(isSource, `${name} is named on /privacidade but is not a feed source`).toBe(true)
    }
  })

  it("does not name an outlet the site never reads", () => {
    // DW was listed for a long time without ever being a source.
    const absent = FEED_SOURCES.every((source) => !source.name.includes("DW"))
    expect(absent).toBe(true)
    expect(privacy).not.toMatch(/\bDW\b/)
  })

  // If the page says analytics is in use, it has to actually be in use.
  it("backs the analytics claim with an installed, rendered dependency", () => {
    expect(privacy).toContain("Vercel Analytics")
    expect(pkg.dependencies).toHaveProperty("@vercel/analytics")
    expect(layout).toContain("<Analytics />")
  })

  it("backs the speed measurement claim the same way", () => {
    expect(privacy).toContain("Speed Insights")
    expect(pkg.dependencies).toHaveProperty("@vercel/speed-insights")
    expect(layout).toContain("<SpeedInsights />")
  })

  // The server signs feed images into same-origin proxy paths; the client no
  // longer turns arbitrary remote URLs into proxy requests by itself.
  it("describes image loading the way the server and component actually do it", () => {
    expect(aggregateSource).toContain("createImageProxyUrl")
    expect(imageProxySignature).toContain("/api/img-proxy")
    expect(newsImage).toContain('src.startsWith("/")')
    expect(privacy).toContain("proxy")
    expect(privacy).not.toContain("carregadas diretamente dos servidores")
  })

  it("states plainly that there are no cookies at all", () => {
    // Nothing in the app sets one, so the stronger claim is the true one.
    expect(privacy).toContain("não usa cookies")
  })

  it("quotes the rate limit the code actually enforces", () => {
    expect(RATE_LIMIT_MAX_REQUESTS).toBe(30)
    expect(privacy).toContain("30 por minuto")
  })

  /**
   * The page said the IP counter was kept "em memória" and that no persistent
   * history was retained. The second half was true; the first was not, once
   * lib/rate-limit.ts grew an Upstash Redis path. With those env vars set the
   * reader's IP is the key of a counter held by a third-party service — which
   * the page described nowhere, while the section above it promises that stored
   * data never reaches "nós nem terceiros".
   */
  it("discloses the external store whenever the code can send an IP to one", () => {
    const supportsExternalStore = rateLimitSource.includes("UPSTASH_REDIS_REST_URL")
    if (!supportsExternalStore) return
    expect(privacy, "the Upstash path exists but /privacidade never mentions it").toContain("Upstash")
    expect(
      privacy,
      "/privacidade still claims the counter is in memory, which is false when Upstash is configured",
    ).not.toMatch(/controle é feito em\s+memória/)
  })

  it("names the image proxy's separate, higher limit rather than implying one budget", () => {
    expect(IMAGE_BUCKET.max).toBeGreaterThan(NEWS_BUCKET.max)
    expect(privacy).toContain("limite próprio")
  })
})

/**
 * Every route that can be driven by an anonymous caller has to be metered. This
 * is a sweep rather than a per-route test on purpose: the two endpoints that
 * were unlimited (/api/img-proxy and /api/csp-report) were not forgotten by
 * someone who considered them, they were simply never revisited after being
 * added. A test that enumerates the directory catches the next one too.
 */
describe("every public API route is rate limited", () => {
  const EXEMPT = new Set([
    // Runs on a schedule behind a bearer secret, not on reader traffic.
    "cron/ingest",
    // Statically rendered: it takes no request input, so Next prerenders it and
    // revalidates on a timer. Reader traffic is served from that copy and never
    // reaches the upstream quote lookup, so there is no per-request work to
    // meter. Guarded below, because that is only true while it stays static.
    "finance",
  ])

  it("keeps /api/finance static, which is the reason it needs no limiter", () => {
    const source = readFileSync(new URL("../app/api/finance/route.ts", import.meta.url), "utf8")
    // Taking a request argument would make it dynamic, and then every call
    // would hit the external API — at which point it needs a limiter like the
    // rest and must come off the exempt list above.
    expect(source).toMatch(/export async function GET\(\s*\)/)
    expect(source).toMatch(/export const revalidate/)
  })

  function routeFiles(): string[] {
    const found: string[] = []
    const walk = (dir: URL, prefix: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`)
        else if (entry.name === "route.ts") found.push(prefix.replace(/\/$/, ""))
      }
    }
    walk(new URL("../app/api/", import.meta.url), "")
    return found.sort()
  }

  it("finds the routes it is meant to be checking", () => {
    // A broken walk would make every assertion below vacuously pass.
    expect(routeFiles()).toContain("news")
    expect(routeFiles()).toContain("img-proxy")
  })

  it.each(routeFiles().filter((route) => !EXEMPT.has(route)))(
    "/api/%s calls the rate limiter",
    (route) => {
      const source = readFileSync(new URL(`../app/api/${route}/route.ts`, import.meta.url), "utf8")
      expect(source).toMatch(/checkRateLimit(Distributed)?\(/)
    },
  )
})

/**
 * Everything the site keeps in the reader's browser has to appear in the list
 * on /privacidade. The games were shipped after that list was written and were
 * never added to it, so three keys of stored data went undisclosed.
 */
describe("privacy page discloses every stored key", () => {
  // Sources of localStorage keys, so a new one is caught by the sweep below.
  const SOURCE_DIRS = ["components", "hooks", "lib", "app"]

  // What each key is called in the policy text.
  const DISCLOSED: Record<string, string> = {
    "orbita-favorites": "favoritas",
    "orbita-history": "histórico de buscas",
    "orbita-theme": "tema",
    "orbita-prefs": "preferências de conteúdo",
    "orbita-termo-stats": "estatísticas",
    "orbita-termo-daily": "tentativas do jogo do dia",
    "orbita-sudoku-best": "melhor tempo",
  }

  function storageKeysInUse(): string[] {
    const keys = new Set<string>()
    const walk = (dir: URL) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, dir)
        if (entry.isDirectory()) walk(child)
        else if (/\.tsx?$/.test(entry.name)) {
          const text = readFileSync(child, "utf8")
          for (const match of text.matchAll(/"(orbita-[a-z-]+)"/g)) keys.add(match[1])
        }
      }
    }
    for (const dir of SOURCE_DIRS) walk(new URL(`../${dir}/`, import.meta.url))
    // Not localStorage: server-side cache tags, which share the prefix but
    // never touch the reader's browser and so have nothing to disclose.
    keys.delete("orbita-feed")
    keys.delete("orbita-aggregate")
    return [...keys].sort()
  }

  it("mentions every key the app stores in the browser", () => {
    for (const key of storageKeysInUse()) {
      const phrase = DISCLOSED[key]
      expect(phrase, `${key} is stored but this test does not know its wording`).toBeDefined()
      expect(privacy, `${key} is stored but /privacidade never mentions it`).toContain(phrase)
    }
  })

  it("knows about every key that exists, so a new one fails loudly", () => {
    expect(storageKeysInUse()).toEqual(Object.keys(DISCLOSED).sort())
  })
})

/**
 * The terms describe what the site is. They were written when it was only a
 * news reader and never mentioned the games or the student area.
 */
describe("terms of use match the site", () => {
  it("mentions the sections the site actually has", () => {
    for (const section of ["jogos", "estudante", "Termo", "Sudoku"]) {
      expect(terms).toContain(section)
    }
  })

  it("only claims MIT if a licence file backs it", () => {
    expect(terms).toContain("MIT")
    const licence = readFileSync(new URL("../LICENSE", import.meta.url), "utf8")
    expect(licence).toContain("MIT License")
    expect(pkg.license).toBe("MIT")
  })

  it("quotes the same rate limit as the code and the privacy page", () => {
    expect(terms).toContain("30")
  })

  // Added after the fallback fix: the terms described partial failure only.
  it("describes what happens when every source fails", () => {
    expect(terms).toContain("manchetes inventadas")
  })

  it("points at the security disclosure process that exists", () => {
    expect(terms).toContain("SECURITY.md")
    const security = readFileSync(new URL("../SECURITY.md", import.meta.url), "utf8")
    expect(security.length).toBeGreaterThan(0)
  })
})
