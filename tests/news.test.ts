import { describe, expect, it } from "vitest"
import { decodeEntities, inferCategory, normalize, plainText, truncate } from "@/lib/news"

describe("decodeEntities", () => {
  it("decodes named, decimal and hex entities", () => {
    expect(decodeEntities("Tom &amp; Jerry")).toBe("Tom & Jerry")
    expect(decodeEntities("aspas &quot;x&quot;")).toBe('aspas "x"')
    expect(decodeEntities("&#233;")).toBe("é")
    expect(decodeEntities("&#xe9;")).toBe("é")
    expect(decodeEntities("&nbsp;fim")).toBe(" fim")
  })

  it("decodes &amp; last so double-encoded entities survive one pass", () => {
    // "&amp;lt;" -> "&lt;" after one decode; a second pass would yield "<".
    expect(decodeEntities("&amp;lt;")).toBe("&lt;")
  })
})

describe("plainText", () => {
  it("returns empty string for non-strings", () => {
    expect(plainText(undefined)).toBe("")
    expect(plainText(null)).toBe("")
    expect(plainText(42)).toBe("")
  })

  it("strips HTML tags and collapses whitespace", () => {
    expect(plainText("<p>Olá   <b>mundo</b></p>")).toBe("Olá mundo")
  })

  it("unwraps double-encoded HTML in two passes (Agência Brasil case)", () => {
    // Feed puts escaped markup in the description: "&lt;p&gt;Texto&lt;/p&gt;".
    expect(plainText("&lt;p&gt;Texto importante&lt;/p&gt;")).toBe("Texto importante")
  })
})

describe("truncate", () => {
  it("returns the text unchanged when within the limit", () => {
    expect(truncate("curto", 20)).toBe("curto")
  })

  it("cuts on a word boundary and appends an ellipsis", () => {
    const original = "O Banco Central anunciou uma nova decisão importante hoje"
    const result = truncate(original, 30)
    expect(result.endsWith("…")).toBe(true)
    // The kept text (without the ellipsis) is a whole-word prefix: the original
    // continues with a space right after it, so no word was split.
    const kept = result.slice(0, -1)
    expect(original.startsWith(kept)).toBe(true)
    expect(original[kept.length]).toBe(" ")
    expect(result.length).toBeLessThanOrEqual(31)
  })

  it("strips trailing punctuation before the ellipsis", () => {
    expect(truncate("Primeira frase completa aqui, e mais texto", 24)).not.toMatch(/[,\s]…$/)
  })

  it("hard-cuts a single very long token", () => {
    expect(truncate("a".repeat(50), 10)).toBe(`${"a".repeat(10)}…`)
  })
})

describe("normalize", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalize("Eleição")).toBe("eleicao")
    expect(normalize("SÃO PAULO")).toBe("sao paulo")
  })
})

describe("inferCategory", () => {
  it("classifies by keyword", () => {
    expect(inferCategory("Banco Central sobe os juros", "Mundo")).toBe("Economia")
    expect(inferCategory("Novo software com inteligência artificial", "Mundo")).toBe("Tecnologia")
    expect(inferCategory("Campanha de vacina contra o vírus", "Mundo")).toBe("Saúde")
    expect(inferCategory("Seleção vence e vai à final da Copa", "Mundo")).toBe("Esportes")
    expect(inferCategory("Telescópio observa o espaço profundo", "Mundo")).toBe("Ciência")
    expect(inferCategory("Novo festival de cinema abre inscrições", "Mundo")).toBe("Cultura")
    expect(inferCategory("Presidente sanciona lei no Congresso", "Mundo")).toBe("Política")
  })

  it("falls back to the source category when nothing matches", () => {
    expect(inferCategory("Manchete genérica sem palavras-chave", "Mundo")).toBe("Mundo")
  })
})
