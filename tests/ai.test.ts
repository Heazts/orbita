import { describe, expect, it } from "vitest"
import { generateLocalSummary, inferEditorialTone } from "@/lib/ai"
import type { NewsItem } from "@/lib/news"

describe("inferEditorialTone", () => {
  const make = (title: string, description = "", source = "Fonte"): NewsItem => ({
    id: "1",
    title,
    description,
    url: "https://example.com/1",
    image: null,
    source,
    category: "Política",
    publishedAt: new Date().toISOString(),
  })

  it("classifies official announcements", () => {
    expect(inferEditorialTone(make("Governo sanciona nova lei no Congresso"))).toBe("Comunicado Oficial")
    expect(inferEditorialTone(make("Nota oficial sobre a reunião de emergência"))).toBe("Comunicado Oficial")
  })

  it("classifies opinion pieces", () => {
    expect(inferEditorialTone(make("Coluna: O futuro da economia nacional"))).toBe("Opinião")
    expect(inferEditorialTone(make("Artigo de opinião sobre a reforma tributária"))).toBe("Opinião")
  })

  it("classifies analysis pieces", () => {
    expect(inferEditorialTone(make("Entenda os impactos da decisão do Banco Central"))).toBe("Análise")
    expect(inferEditorialTone(make("Análise: O que muda nas regras da aposentadoria"))).toBe("Análise")
  })

  it("defaults to Informativo for standard news", () => {
    expect(inferEditorialTone(make("Bolsa de valores fecha em alta de 1.5%"))).toBe("Informativo")
  })
})

describe("generateLocalSummary", () => {
  const item: NewsItem = {
    id: "1",
    title: "Banco Central aprova nova regulamentação bancária",
    description: "A medida entra em vigor a partir do próximo mês. O objetivo é aumentar a segurança do sistema financeiro.",
    url: "https://example.com/1",
    image: null,
    source: "Fonte Exemplo",
    category: "Economia",
    publishedAt: new Date().toISOString(),
  }

  it("generates 3 structured takeaway bullets 100% locally", () => {
    const summary = generateLocalSummary(item)
    expect(summary.bullets).toHaveLength(3)
    expect(summary.bullets[0]).toContain("Banco Central aprova nova regulamentação bancária")
    expect(summary.privacyNote).toContain("100% processado no seu navegador")
    expect(summary.readTimeMinutes).toBeGreaterThanOrEqual(1)
  })
})
