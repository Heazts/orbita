import { describe, expect, it } from "vitest"
import { generateMetadata } from "@/app/erro/[code]/page"

const titleFor = async (code: string): Promise<string> => {
  const metadata = await generateMetadata({ params: Promise.resolve({ code }) })
  return String(metadata.title)
}

describe("generateMetadata for /erro/[code]", () => {
  it.each(["400", "403", "404", "429", "500", "502", "503", "504"])(
    "keeps the recognised status code %s",
    async (code) => {
      expect(await titleFor(code)).toBe(`Erro ${code} · Órbita`)
    },
  )

  it("uppercases a recognised lowercase code", async () => {
    expect(await titleFor("offline")).toBe("Erro OFFLINE · Órbita")
  })

  // The segment used to be interpolated raw, so any URL could choose the words
  // shown in the tab title and in shared-link previews, over the site's name,
  // while the page body rendered the generic 500.
  it.each([
    "sua-conta-foi-suspensa",
    "999",
    "<script>",
    "clique-aqui-para-recuperar-sua-senha",
  ])("falls back to 500 for the unrecognised segment %s", async (code) => {
    expect(await titleFor(code)).toBe("Erro 500 · Órbita")
  })

  it("does not let an arbitrarily long segment into the title", async () => {
    expect(await titleFor("a".repeat(5_000))).toBe("Erro 500 · Órbita")
  })

  it("marks the page noindex", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ code: "404" }) })
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})
