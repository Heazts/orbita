import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { FEED_SOURCES } from "@/lib/news"

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
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8")
const newsImage = readFileSync(new URL("../components/ui/news-image.tsx", import.meta.url), "utf8")
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))

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

  // The page now claims images are proxied rather than fetched by the browser.
  it("describes image loading the way the component actually does it", () => {
    expect(newsImage).toContain("/api/img-proxy")
    expect(privacy).toContain("proxy")
    expect(privacy).not.toContain("carregadas diretamente dos servidores")
  })

  it("still states there are no tracking cookies", () => {
    expect(privacy).toContain("não usa cookies de rastreamento")
  })
})
