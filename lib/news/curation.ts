/**
 * Assigning categories and choosing what leads the homepage.
 *
 * Editorial judgement expressed as code: which stories count as heavy, and how
 * much of the front page they may occupy. Kept apart from the text utilities so
 * a change of tone policy never touches the parser.
 */

import type { FeedSource, NewsItem } from "./types"
import { normalize } from "./text"

// Category badge styling. Deliberately monochrome: the design system is a
// single palette (white / #111111 / #6B7280 / #E5E7EB, blue #2563EB for
// emphasis, red #DC2626 for urgency), so categories are distinguished by their
// *label*, not by 11 competing hues. The lead card gets the solid blue fill;
// every other card gets a quiet outline that doesn't fight the headline for
// attention. Colour is never the sole carrier of meaning (WCAG 1.4.1) — the
// category name is always spelled out inside the badge.
export function getCategoryBadgeStyle(lead = false): string {
  return lead
    ? "bg-primary text-primary-foreground border border-primary"
    : "bg-transparent text-muted-foreground border border-border"
}

// Categories that describe the *outlet*, not the subject. A good-news feed is
// good news whichever topic it covers, so topic keywords must not reclassify it.
//
// This is what emptied "Boas notícias": the category has one source, every rule
// below matches on subject, and none of them can ever produce "Boas notícias".
// A hopeful story about a doctor became Saúde, about a school became Educação,
// about a discovery became Ciência — until the category the reader clicked had
// nothing left in it. A tone is orthogonal to a topic; inferring one from the
// other can only destroy it.
const SOURCE_DEFINED_CATEGORIES = new Set<FeedSource["category"]>(["Boas notícias"])

export function inferCategory(
  title: string,
  fallback: FeedSource["category"],
): FeedSource["category"] {
  if (SOURCE_DEFINED_CATEGORIES.has(fallback)) return fallback
  const normalized = normalize(title)
  const rules: Array<{ test: RegExp; category: FeedSource["category"] }> = [
    // Cyber & AI runs first so a hacker/breach/AI story isn't swallowed by the
    // broader "Tecnologia" rule below.
    { test: /hacker|ransomware|malware|phishing|vazamento de dados|dados vazados|ciberataqu|cibernetic|cibersegur|seguranca digital|inteligencia artificial|chatgpt|openai|ia generativa|deepfake/, category: "Cyber & IA" },
    { test: /enem|vestibular|faculdade|universidade|sisu|prouni|fies|bolsa de estudo|graduacao|mestrado|doutorado|estudante/, category: "Educação" },
    { test: /econom|mercado|inflacao|banco|juros|empresa|negocio/, category: "Economia" },
    { test: /tecnolog|digital|internet|software|celular|aplicativo/, category: "Tecnologia" },
    { test: /saude|vacina|hospital|doenca|medic|remedio|sus|virus|pandemia/, category: "Saúde" },
    { test: /futebol|copa|olimpi|campeonato|jogador|tecnico|placar|gol|esporte|atleta/, category: "Esportes" },
    { test: /ciencia|espaco|nasa|pesquisa|clima|estudo|astronomia/, category: "Ciência" },
    { test: /cultura|cinema|musica|livro|arte|festival/, category: "Cultura" },
    { test: /governo|eleicao|presidente|congresso|politica|ministro/, category: "Política" },
  ]
  const match = rules.find(({ test }) => test.test(normalized))
  return match?.category ?? fallback
}

// Topics that make a heavy/pessimistic lead. Used by curateHomepage to keep the
// top of the default view balanced — these items are never hidden, just kept
// out of the hero/first slots so opening the site doesn't feel like a wall of
// tragedy. Matched against accent-stripped, lowercased text (see normalize).
const HEAVY_TOPIC =
  /morte|morto|mortos|assassin|homicidio|feminicidio|tragedia|tragic|massacre|chacina|estupro|guerra|bombardei|atentado|tiroteio|acidente|desastre|catastrofe|recessao|corrupcao|escandalo|violencia|sequestro|overdose|suicidio|golpe militar/

export function isHeavyTopic(item: Pick<NewsItem, "title" | "description">): boolean {
  return HEAVY_TOPIC.test(normalize(`${item.title} ${item.description}`))
}

// Reorders the default homepage feed so it opens balanced: a bright, varied
// lead (with an image when possible), the first few slots kept light and
// category-diverse, and no two same-category items back to back when avoidable.
// Nothing is dropped — heavy news still appears, just not as the first thing a
// reader sees. Only applied to the unfiltered "latest" view; search, category,
// period and live modes keep their exact chronological/relevance order.
export function curateHomepage(items: NewsItem[]): NewsItem[] {
  if (items.length <= 3) return items
  // Lead: freshest bright item, preferring one with an image for the hero card.
  let leadIndex = items.findIndex((item) => !isHeavyTopic(item) && item.image)
  if (leadIndex === -1) leadIndex = items.findIndex((item) => !isHeavyTopic(item))
  if (leadIndex === -1) leadIndex = 0

  const pool = items.filter((_, index) => index !== leadIndex)
  const result: NewsItem[] = [items[leadIndex]]
  const BRIGHT_TOP = 4 // keep roughly the first screenful light

  while (pool.length > 0) {
    const prevCategory = result[result.length - 1].category
    const wantBright = result.length < BRIGHT_TOP
    let index = pool.findIndex((item) => item.category !== prevCategory && (!wantBright || !isHeavyTopic(item)))
    if (index === -1) index = pool.findIndex((item) => !wantBright || !isHeavyTopic(item))
    if (index === -1) index = pool.findIndex((item) => item.category !== prevCategory)
    if (index === -1) index = 0
    result.push(pool[index])
    pool.splice(index, 1)
  }
  return result
}
