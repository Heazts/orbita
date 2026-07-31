import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { FEED_SOURCES } from "@/lib/news"

const readme = () => readFileSync(join(process.cwd(), "README.md"), "utf8")

/**
 * Keeps the README's source table in step with FEED_SOURCES.
 *
 * This exists because the two had already drifted: the README advertised
 * "DW Brasil" and "WWF", neither of which the aggregator has ever fetched in
 * its current form, while omitting eleven sources it does fetch. For a news
 * site the source list is not decoration — a reader deciding whether to trust
 * the aggregation reads exactly this — so a stale list is a factual error, not
 * a formatting nit.
 */
describe("README source table", () => {
  const table = () => {
    const body = readme()
    const start = body.indexOf("<!-- FEED_SOURCES:start -->")
    const end = body.indexOf("<!-- FEED_SOURCES:end -->")
    expect(start, "marcador de início da tabela de fontes ausente").toBeGreaterThan(-1)
    expect(end, "marcador de fim da tabela de fontes ausente").toBeGreaterThan(start)
    return body.slice(start, end)
  }

  it("documents every source the aggregator actually fetches", () => {
    const documented = table()
    for (const source of FEED_SOURCES) {
      expect(documented, `${source.name} não está documentada no README`).toContain(
        `| ${source.name} | ${source.category} |`,
      )
    }
  })

  it("claims no source the aggregator does not fetch", () => {
    const rows = [...table().matchAll(/^\| (.+?) \| (.+?) \|$/gm)]
      .map((match) => match[1])
      .filter((name) => name !== "Fonte" && !name.startsWith("---"))

    const known = new Set(FEED_SOURCES.map((source) => source.name))
    for (const name of rows) {
      expect(known.has(name), `README anuncia "${name}", que não está em FEED_SOURCES`).toBe(true)
    }
    expect(rows).toHaveLength(FEED_SOURCES.length)
  })

  it("names each source's category correctly", () => {
    const documented = table()
    for (const source of FEED_SOURCES) {
      const row = documented.match(new RegExp(`^\\| ${escapeRegExp(source.name)} \\| (.+?) \\|$`, "m"))
      expect(row, `linha ausente para ${source.name}`).toBeTruthy()
      expect(row![1]).toBe(source.category)
    }
  })
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
