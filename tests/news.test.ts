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

  it("removes script and style contents, including spaced closing tags", () => {
    expect(
      plainText("<script>alert('x')</script ><style>body{display:none}</style ><p>Texto seguro</p>"),
    ).toBe("Texto seguro")
  })

  it("removes scripts that arrive double-encoded by a feed", () => {
    expect(plainText("&lt;script&gt;alert(1)&lt;/script &gt;&lt;p&gt;Visível&lt;/p&gt;")).toBe("Visível")
  })

  it("handles many script tags in linear time without leaking their contents", () => {
    const hostile = `${"<script>x</script >".repeat(10_000)}Conteúdo final`
    expect(plainText(hostile)).toBe("Conteúdo final")
  })

  it("strips a leaked \"[object Object]\" artifact from feed text (Globo/GE case)", () => {
    expect(plainText("[object Object]Carpini, em coletiva")).toBe("Carpini, em coletiva")
    expect(plainText("Antes [object Object] depois")).toBe("Antes depois")
  })

  it("strips trailing RSS boilerplate call-to-action phrases", () => {
    expect(plainText("Notícia completa aqui. Clique aqui")).toBe("Notícia completa aqui.")
    expect(plainText("Veja todas as fotos no site. Leia mais")).toBe("Veja todas as fotos no site.")
    expect(plainText("Confira a matéria na íntegra. Saiba mais")).toBe("Confira a matéria na íntegra.")
  })

  it("strips leaked HTML image attributes from WordPress feeds", () => {
    const leaked = 'Deutsche Bank " data-image-caption=" Deutsche Bank (Foto: REUTERS/Jon Nazca/File Photo) " data-large-file="https://www.infomoney.com.br/wp-content/uploads/2024/07/Captura-de-tela-2024-07-24-080431.png?fit=1093%2C730&qual...'
    expect(plainText(leaked)).toBe("Deutsche Bank")
  })
})

describe("truncate", () => {
  it("preserves text with terminal punctuation within the limit", () => {
    expect(truncate("Texto completo.", 20)).toBe("Texto completo.")
  })

  it("appends an ellipsis to text without terminal punctuation so it is not cut off abruptly", () => {
    expect(truncate("Texto sem ponto", 20)).toBe("Texto sem ponto…")
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

  // The bug that emptied the category: "Boas notícias" describes the outlet,
  // not the subject. Every rule above matches on subject and none of them can
  // ever produce "Boas notícias", so each keyword match stole an item away
  // until the category the reader clicked had nothing left in it.
  describe("Boas notícias is decided by the source, not the subject", () => {
    const goodNews = [
      "Médico cria projeto que leva vacina a ribeirinhos",
      "Escola pública dobra aprovação no vestibular",
      "Pesquisa brasileira encontra forma de limpar rios",
      "Atleta doa prêmio de campeonato para o bairro onde cresceu",
      "Festival de cinema arrecada toneladas de alimentos",
      "Banco de alimentos amplia atendimento com nova sede",
    ]

    it("keeps every one of these in Boas notícias", () => {
      for (const title of goodNews) {
        expect(inferCategory(title, "Boas notícias"), title).toBe("Boas notícias")
      }
    })

    it("would have reclassified all of them from any other source", () => {
      // Same headlines, ordinary source: the keyword rules still apply, which
      // is what makes the exception above necessary rather than cosmetic.
      const moved = goodNews.filter((title) => inferCategory(title, "Mundo") !== "Mundo")
      expect(moved).toHaveLength(goodNews.length)
    })

    it("does not disturb the other categories", () => {
      expect(inferCategory("Banco Central sobe os juros", "Economia")).toBe("Economia")
      expect(inferCategory("Campanha de vacina contra o vírus", "Mundo")).toBe("Saúde")
    })
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
