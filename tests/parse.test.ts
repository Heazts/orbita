import { describe, expect, it } from "vitest"
import type { FeedSource, NewsItem } from "@/lib/news"
import { asArray, findImage, findLink, isUsableImage, parseFeed, relevance, textValue } from "@/lib/parse"

const SOURCE: FeedSource = { name: "Fonte Teste", url: "https://example.com/feed", category: "Mundo" }

describe("asArray", () => {
  it("wraps single values and passes arrays through", () => {
    expect(asArray(undefined)).toEqual([])
    expect(asArray("x")).toEqual(["x"])
    expect(asArray(["a", "b"])).toEqual(["a", "b"])
  })
})

describe("textValue", () => {
  it("reads plain strings, numbers and nested #text/@_href", () => {
    expect(textValue("olá")).toBe("olá")
    expect(textValue(2024)).toBe("2024")
    expect(textValue({ "#text": "conteúdo" })).toBe("conteúdo")
    expect(textValue({ "@_href": "https://x.com" })).toBe("https://x.com")
    expect(textValue({})).toBe("")
  })
})

describe("isUsableImage", () => {
  it("accepts https images and rejects decorative/non-https ones", () => {
    expect(isUsableImage("https://cdn.site.com/foto.jpg")).toBe(true)
    expect(isUsableImage("http://cdn.site.com/foto.jpg")).toBe(false)
    expect(isUsableImage("https://cdn.site.com/logo.png")).toBe(false)
    expect(isUsableImage("https://cdn.site.com/pixel.gif")).toBe(false)
    expect(isUsableImage("https://cdn.site.com/icon.svg")).toBe(false)
    expect(isUsableImage(undefined)).toBe(false)
  })
})

describe("findImage", () => {
  it("prefers media:content url", () => {
    expect(findImage({ "media:content": { "@_url": "https://cdn.site.com/foto.jpg" } })).toBe("https://cdn.site.com/foto.jpg")
  })

  it("falls back to enclosure", () => {
    expect(findImage({ enclosure: { "@_url": "https://cdn.site.com/capa.jpg" } })).toBe("https://cdn.site.com/capa.jpg")
  })

  it("extracts the first non-decorative <img> from description", () => {
    const description = '&lt;img src="https://cdn.site.com/logo.png"&gt;&lt;img src="https://cdn.site.com/materia.jpg"&gt;'
    expect(findImage({ description })).toBe("https://cdn.site.com/materia.jpg")
  })

  it("returns null when there is no usable image", () => {
    expect(findImage({ description: "sem imagem" })).toBeNull()
  })
})

describe("findLink", () => {
  it("reads a string link", () => {
    expect(findLink({ link: "https://example.com/a" })).toBe("https://example.com/a")
  })

  it("reads an Atom link object via @_href", () => {
    expect(findLink({ link: { "@_href": "https://example.com/atom" } })).toBe("https://example.com/atom")
  })

  it("falls back to guid", () => {
    expect(findLink({ guid: "https://example.com/guid" })).toBe("https://example.com/guid")
  })
})

const RSS = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Feed</title>
    <item>
      <title>Notícia com imagem</title>
      <link>https://example.com/1</link>
      <description>&lt;p&gt;Resumo da matéria&lt;/p&gt;</description>
      <pubDate>Tue, 01 Jul 2025 12:00:00 GMT</pubDate>
      <media:content url="https://cdn.site.com/foto.jpg" />
    </item>
    <item>
      <title>Sem link válido</title>
      <description>ignorada</description>
    </item>
  </channel>
</rss>`

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Entrada Atom</title>
    <link href="https://example.com/atom-1" />
    <summary>Resumo atom</summary>
    <updated>2025-07-01T12:00:00Z</updated>
  </entry>
</feed>`

const GOOGLE = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Manchete importante - Veículo X</title>
      <link>https://news.google.com/articles/abc</link>
      <source url="https://veiculox.com">Veículo X</source>
      <pubDate>Tue, 01 Jul 2025 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

describe("parseFeed", () => {
  it("parses RSS items and drops items without a valid link", () => {
    const items = parseFeed(RSS, SOURCE)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe("Notícia com imagem")
    expect(items[0].url).toBe("https://example.com/1")
    // id is the url itself: items are already deduplicated by url downstream,
    // so this is a collision-free identifier without needing a hash.
    expect(items[0].id).toBe("https://example.com/1")
    expect(items[0].description).toBe("Resumo da matéria")
    expect(items[0].image).toBe("https://cdn.site.com/foto.jpg")
    expect(items[0].source).toBe("Fonte Teste")
    expect(new Date(items[0].publishedAt).getUTCFullYear()).toBe(2025)
  })

  it("parses Atom entries with link href", () => {
    const items = parseFeed(ATOM, SOURCE)
    expect(items).toHaveLength(1)
    expect(items[0].url).toBe("https://example.com/atom-1")
    expect(items[0].title).toBe("Entrada Atom")
  })

  it("strips the trailing ' - Source' suffix for Google News results", () => {
    const items = parseFeed(GOOGLE, SOURCE, true)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe("Manchete importante")
    expect(items[0].source).toBe("Veículo X")
  })
})

describe("relevance", () => {
  const item: NewsItem = {
    id: "1",
    title: "Eleição presidencial no Brasil",
    description: "Cobertura completa do pleito",
    url: "https://example.com/1",
    image: null,
    source: "Fonte Teste",
    category: "Política",
    publishedAt: new Date().toISOString(),
  }

  it("scores title matches higher than body matches", () => {
    expect(relevance(item, ["eleicao"])).toBe(5)
    expect(relevance(item, ["cobertura"])).toBe(2)
    expect(relevance(item, ["inexistente"])).toBe(0)
  })

  it("sums scores across terms", () => {
    expect(relevance(item, ["eleicao", "cobertura"])).toBe(7)
  })
})
