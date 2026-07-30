import { describe, expect, it } from "vitest"
import { clusterNews, jaccardSimilarity, toClusteredItems } from "@/lib/clustering"
import type { NewsItem } from "@/lib/news"

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    const a = new Set(["banco", "central", "juros"])
    const b = new Set(["banco", "central", "juros"])
    expect(jaccardSimilarity(a, b)).toBe(1)
  })

  it("returns 0 for disjoint sets", () => {
    const a = new Set(["banco", "central"])
    const b = new Set(["futebol", "selecao"])
    expect(jaccardSimilarity(a, b)).toBe(0)
  })

  it("calculates correct fractional overlap", () => {
    const a = new Set(["banco", "central", "juros"])
    const b = new Set(["banco", "central", "inflacao"])
    // intersection = 2 (banco, central), union = 4 (banco, central, juros, inflacao) -> 2/4 = 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5)
  })
})

describe("clusterNews", () => {
  const make = (id: string, title: string, source: string): NewsItem => ({
    id,
    title,
    description: "Resumo da matéria.",
    url: `https://example.com/${id}`,
    image: null,
    source,
    category: "Economia",
    publishedAt: new Date().toISOString(),
  })

  it("clusters news articles about the same event from different sources", () => {
    const items = [
      make("1", "Banco Central mantém taxa Selic em 10,50%", "G1"),
      make("2", "Banco Central decide manter a taxa Selic em 10,50%", "CNN Brasil"),
      make("3", "Telescópio da NASA descobre novo exoplaneta habitável", "NASA"),
    ]

    const clusters = clusterNews(items, 0.35)
    expect(clusters).toHaveLength(2)

    const selicCluster = clusters.find((c) => c.lead.title.includes("Selic"))
    expect(selicCluster).toBeDefined()
    expect(selicCluster?.items).toHaveLength(2)
    expect(selicCluster?.sourcesCount).toBe(2)
  })

  it("keeps unique articles in single-item clusters", () => {
    const items = [
      make("1", "Notícia única de política", "Fonte A"),
      make("2", "Matéria totalmente diferente de ciência", "Fonte B"),
    ]

    const clusters = clusterNews(items)
    expect(clusters).toHaveLength(2)
    expect(clusters[0].items).toHaveLength(1)
    expect(clusters[1].items).toHaveLength(1)
  })

  describe("toClusteredItems", () => {
    it("attaches sourcesCount/relatedSources only when a cluster has more than one item", () => {
      const items = [
        make("1", "Banco Central mantém taxa Selic em 10,50%", "G1"),
        make("2", "Banco Central decide manter a taxa Selic em 10,50%", "CNN Brasil"),
        make("3", "Telescópio da NASA descobre novo exoplaneta habitável", "NASA"),
      ]

      const result = toClusteredItems(items, 0.35)
      expect(result).toHaveLength(2)

      const selic = result.find((item) => item.title.includes("Selic"))
      expect(selic?.sourcesCount).toBe(2)
      expect(selic?.relatedSources).toEqual(["CNN Brasil"])

      const nasa = result.find((item) => item.title.includes("NASA"))
      expect(nasa?.sourcesCount).toBeUndefined()
      expect(nasa?.relatedSources).toBeUndefined()
    })

    it("returns items unchanged when nothing clusters together", () => {
      const items = [
        make("1", "Notícia única de política", "Fonte A"),
        make("2", "Matéria totalmente diferente de ciência", "Fonte B"),
      ]

      const result = toClusteredItems(items)
      expect(result).toEqual(items)
    })

    it("does not attach sourcesCount when a cluster's items are all from the same outlet", () => {
      // A single publisher re-posting/updating the same story (e.g. via both
      // its direct feed and a Google News hit) clusters together but is one
      // source, not multi-source coverage — must not render as "1 fontes".
      const items = [
        make("1", "Japão registra novo terremoto após tremor que deixou 18 mortos", "Exame"),
        make("2", "Japão registra novo terremoto após tremor que deixou 18 mortos", "Exame"),
      ]

      const result = toClusteredItems(items)
      expect(result).toHaveLength(1)
      expect(result[0].sourcesCount).toBeUndefined()
      expect(result[0].relatedSources).toBeUndefined()
    })
  })
})
