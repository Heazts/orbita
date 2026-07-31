import { describe, expect, it } from "vitest"
import { buildQuickSummary, classifyTone } from "@/lib/summary"
import type { NewsItem } from "@/lib/news"

const make = (
  title: string,
  description = "",
  source = "Fonte",
  category: NewsItem["category"] = "Política",
): NewsItem => ({
  id: "1",
  title,
  description,
  url: "https://example.com/1",
  image: null,
  source,
  category,
  publishedAt: new Date().toISOString(),
})

describe("classifyTone", () => {
  it("classifies official announcements", () => {
    expect(classifyTone(make("Governo sanciona nova lei no Congresso"))).toBe("Comunicado oficial")
    expect(classifyTone(make("Nota oficial sobre a reunião de emergência"))).toBe("Comunicado oficial")
  })

  it("classifies opinion pieces", () => {
    expect(classifyTone(make("Coluna: O futuro da economia nacional"))).toBe("Opinião")
    expect(classifyTone(make("Artigo de opinião sobre a reforma tributária"))).toBe("Opinião")
  })

  it("classifies analysis pieces", () => {
    expect(classifyTone(make("Entenda os impactos da decisão do Banco Central"))).toBe("Análise")
    expect(classifyTone(make("Análise: O que muda nas regras da aposentadoria"))).toBe("Análise")
  })

  it("defaults to Informativo for standard news", () => {
    expect(classifyTone(make("Bolsa de valores fecha em alta de 1.5%"))).toBe("Informativo")
  })

  // The classifier is keyword matching, and the UI labels its output "Tom
  // estimado" precisely because of cases like this one. Pinning the limitation
  // in a test keeps anyone from later presenting the result as authoritative.
  it("is a heuristic: an opinion piece without marker words is not detected", () => {
    expect(classifyTone(make("Acho que o país caminha para um impasse"))).toBe("Informativo")
  })
})

describe("buildQuickSummary", () => {
  const item = make(
    "Banco Central aprova nova regulamentação bancária",
    "A medida entra em vigor a partir do próximo mês. O objetivo é aumentar a segurança do sistema financeiro.",
    "Fonte Exemplo",
    "Economia",
  )

  it("returns the headline followed by the opening sentences", () => {
    const summary = buildQuickSummary(item)
    expect(summary.excerpts.map((excerpt) => excerpt.label)).toEqual([
      "Manchete",
      "Trecho de abertura",
      "Continuação",
    ])
    expect(summary.excerpts[0].text).toBe("Banco Central aprova nova regulamentação bancária")
    expect(summary.excerpts[1].text).toBe("A medida entra em vigor a partir do próximo mês.")
    expect(summary.isHeadlineOnly).toBe(false)
  })

  // The whole justification for the honest renaming is that this feature
  // quotes rather than generates. If that ever stops being true, the label has
  // to change again.
  it("quotes the source verbatim rather than rewriting it", () => {
    const summary = buildQuickSummary(item)
    for (const excerpt of summary.excerpts.slice(1)) {
      expect(item.description).toContain(excerpt.text)
    }
  })

  it("flags headline-only items when the feed gave no description", () => {
    const summary = buildQuickSummary(make("Manchete sem corpo"))
    expect(summary.isHeadlineOnly).toBe(true)
    expect(summary.excerpts).toHaveLength(1)
  })

  it("drops fragments too short to be sentences", () => {
    const summary = buildQuickSummary(make("Título", "Foto. Uma frase de verdade com tamanho suficiente."))
    expect(summary.excerpts).toHaveLength(2)
    expect(summary.excerpts[1].text).toBe("Uma frase de verdade com tamanho suficiente.")
  })

  it("estimates reading time as at least one minute, rounding up", () => {
    expect(buildQuickSummary(make("Curto")).readTimeMinutes).toBe(1)
    const long = make("T", `${"palavra ".repeat(400)}.`)
    expect(buildQuickSummary(long).readTimeMinutes).toBeGreaterThan(1)
  })

  it("counts words across headline and description", () => {
    expect(buildQuickSummary(make("uma duas", "tres quatro cinco.")).wordCount).toBe(5)
  })
})
