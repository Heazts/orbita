// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { escapeXml } from "@/lib/xml"

// fast-xml-parser's XMLValidator — the parser this app uses for *inbound*
// feeds — happily accepts C0 control characters, so it cannot police our own
// output. DOMParser applies the real XML 1.0 rules, which is what the feed
// readers consuming /feed.xml will do.
const domParser = new DOMParser()

function isWellFormed(xml: string): boolean {
  return domParser.parseFromString(xml, "text/xml").querySelector("parsererror") === null
}

// Wraps a value the way app/feed.xml/route.ts does, so a regression surfaces as
// an invalid document rather than merely an unexpected string.
function asFeedDocument(title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><item><title>${escapeXml(
    title,
  )}</title></item></channel></rss>`
}

const char = (code: number): string => String.fromCharCode(code)

describe("escapeXml", () => {
  it("escapes the five XML metacharacters", () => {
    expect(escapeXml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;",
    )
  })

  it("escapes & before the entities it introduces, never double-encoding", () => {
    expect(escapeXml("a & b < c")).toBe("a &amp; b &lt; c")
  })

  it.each([
    ["NUL", 0x00],
    ["BEL", 0x07],
    ["backspace", 0x08],
    ["vertical tab", 0x0b],
    ["form feed", 0x0c],
    ["escape", 0x1b],
    ["unit separator", 0x1f],
    ["noncharacter U+FFFE", 0xfffe],
    ["noncharacter U+FFFF", 0xffff],
  ])("strips %s, which XML 1.0 forbids even when escaped", (_label, code) => {
    const title = `Noticia${char(code)}quebrada`
    expect(escapeXml(title)).toBe("Noticiaquebrada")
    expect(isWellFormed(asFeedDocument(title))).toBe(true)
  })

  it("keeps tab, newline and carriage return, which XML 1.0 allows", () => {
    const title = `a${char(0x09)}b${char(0x0a)}c${char(0x0d)}d`
    expect(escapeXml(title)).toBe(title)
    expect(isWellFormed(asFeedDocument(title))).toBe(true)
  })

  it("strips lone surrogates", () => {
    expect(escapeXml(`quebrado${char(0xd83d)}fim`)).toBe("quebradofim")
    expect(escapeXml(`quebrado${char(0xde00)}fim`)).toBe("quebradofim")
  })

  it("preserves matched surrogate pairs so emoji in headlines survive", () => {
    expect(escapeXml("Foguete 🚀 lançado")).toBe("Foguete 🚀 lançado")
    expect(escapeXml("acentuação e ç preservados")).toBe("acentuação e ç preservados")
  })

  it("produces a well-formed document from a headline full of hostile input", () => {
    const hostile = `</title><script>alert(1)</script> "Tom & Jerry" 🚀 ${char(0x1b)}[31m O'Brien`
    expect(isWellFormed(asFeedDocument(hostile))).toBe(true)
  })
})
