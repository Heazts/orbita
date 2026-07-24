import { describe, expect, it } from "vitest"
import type { NewsItem } from "@/lib/news"
import {
  curateHomepage,
  decodeEntities,
  inferCategory,
  isHeavyTopic,
  normalize,
  plainText,
  truncate,
} from "@/lib/news"

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
    expect(inferCategory("Novo aplicativo de celular chega às lojas", "Mundo")).toBe("Tecnologia")
    expect(inferCategory("Campanha de vacina contra o vírus", "Mundo")).toBe("Saúde")
    expect(inferCategory("Seleção vence e vai à final da Copa", "Mundo")).toBe("Esportes")
    expect(inferCategory("Telescópio observa o espaço profundo", "Mundo")).toBe("Ciência")
    expect(inferCategory("Novo festival de cinema abre inscrições", "Mundo")).toBe("Cultura")
    expect(inferCategory("Presidente sanciona lei no Congresso", "Mundo")).toBe("Política")
  })

  it("falls back to the source category when nothing matches", () => {
    expect(inferCategory("Manchete genérica sem palavras-chave", "Mundo")).toBe("Mundo")
  })

  it("routes cyber/AI stories to Cyber & IA before generic Tecnologia", () => {
    expect(inferCategory("Ransomware causa vazamento de dados de milhões", "Mundo")).toBe("Cyber & IA")
    expect(inferCategory("Nova inteligência artificial da OpenAI é lançada", "Tecnologia")).toBe("Cyber & IA")
  })

  it("classifies education/ENEM/vestibular as Educação", () => {
    expect(inferCategory("Inscrições do ENEM abrem na próxima semana", "Mundo")).toBe("Educação")
    expect(inferCategory("Universidade federal amplia vagas no vestibular", "Mundo")).toBe("Educação")
  })
})

describe("isHeavyTopic", () => {
  const base = { title: "", description: "" }
  it("flags tragic/heavy topics", () => {
    expect(isHeavyTopic({ ...base, title: "Acidente grave deixa mortos na estrada" })).toBe(true)
    expect(isHeavyTopic({ ...base, title: "Guerra se intensifica na região" })).toBe(true)
  })
  it("does not flag neutral/positive topics", () => {
    expect(isHeavyTopic({ ...base, title: "Estudante brasileiro vence olimpíada de matemática" })).toBe(false)
    expect(isHeavyTopic({ ...base, title: "Nova exposição de arte abre no museu" })).toBe(false)
  })
})

describe("curateHomepage", () => {
  const make = (id: string, category: NewsItem["category"], title: string, image: string | null = null): NewsItem => ({
    id,
    title,
    description: "",
    url: `https://example.com/${id}`,
    image,
    source: "Fonte",
    category,
    publishedAt: new Date().toISOString(),
  })

  it("keeps every item (nothing dropped) and preserves the set", () => {
    const items = [
      make("1", "Política", "assassinato choca a cidade"),
      make("2", "Economia", "mercado reage"),
      make("3", "Ciência", "telescópio revela galáxia", "https://img/3.jpg"),
      make("4", "Política", "novo escândalo no congresso"),
      make("5", "Cultura", "festival de cinema começa"),
    ]
    const out = curateHomepage(items)
    expect(out).toHaveLength(items.length)
    expect(new Set(out.map((i) => i.id))).toEqual(new Set(items.map((i) => i.id)))
  })

  it("does not lead with a heavy item and prefers an image for the hero", () => {
    const items = [
      make("1", "Política", "assassinato choca a cidade"),
      make("2", "Economia", "guerra afeta o mercado"),
      make("3", "Ciência", "telescópio revela galáxia", "https://img/3.jpg"),
      make("4", "Cultura", "festival de cinema começa"),
      make("5", "Educação", "estudante vence olimpíada"),
    ]
    const out = curateHomepage(items)
    expect(isHeavyTopic(out[0])).toBe(false)
    expect(out[0].image).toBeTruthy()
  })

  it("avoids two same-category items back to back near the top when possible", () => {
    const items = [
      make("1", "Ciência", "descoberta A", "https://img/1.jpg"),
      make("2", "Política", "debate no senado"),
      make("3", "Política", "voto adiado"),
      make("4", "Cultura", "novo álbum"),
      make("5", "Economia", "juros estáveis"),
    ]
    const out = curateHomepage(items)
    let consecutive = 0
    for (let i = 1; i < out.length; i += 1) {
      if (out[i].category === out[i - 1].category) consecutive += 1
    }
    expect(consecutive).toBe(0)
  })
})
