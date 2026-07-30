export const NEWS_CATEGORIES = [
  "Todas",
  "Mundo",
  "Boas notícias",
  "Política",
  "Economia",
  "Tecnologia",
  "Cyber & IA",
  "Ciência",
  "Educação",
  "Saúde",
  "Esportes",
  "Cultura",
  "Entretenimento",
  "Meio Ambiente",
] as const

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]

export type NewsItem = {
  id: string
  title: string
  description: string
  url: string
  image: string | null
  source: string
  category: Exclude<NewsCategory, "Todas">
  publishedAt: string
  // Set only when lib/clustering.ts merges this item with equivalent coverage
  // from other outlets (same story, different URL/headline). Absent — not 1 —
  // for a story with no known duplicates, so the common case carries no noise.
  sourcesCount?: number
  relatedSources?: string[]
}

export type NewsResponse = {
  items: NewsItem[]
  updatedAt: string
  sourceCount: number
  isFallback?: boolean
  isLive?: boolean
  // Names of feed sources that failed to load for this response, so the client
  // can tell the user some sources are temporarily unavailable.
  failedSources?: string[]
}

export type FeedSource = {
  name: string
  url: string
  category: Exclude<NewsCategory, "Todas">
}

export const FEED_SOURCES: FeedSource[] = [
  {
    name: "BBC Brasil",
    url: "https://feeds.bbci.co.uk/portuguese/rss.xml",
    category: "Mundo",
  },
  {
    name: "CNN Brasil",
    url: "https://admin.cnnbrasil.com.br/feed/",
    category: "Mundo",
  },
  {
    name: "Euronews",
    url: "https://pt.euronews.com/rss?level=theme&name=news",
    category: "Mundo",
  },
  {
    name: "Agência Brasil",
    url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml",
    category: "Política",
  },
  {
    name: "Poder360",
    url: "https://www.poder360.com.br/feed/",
    category: "Política",
  },
  {
    name: "InfoMoney",
    url: "https://www.infomoney.com.br/feed/",
    category: "Economia",
  },
  {
    name: "Exame",
    url: "https://exame.com/feed/",
    category: "Economia",
  },
  {
    name: "Olhar Digital",
    url: "https://olhardigital.com.br/feed/",
    category: "Tecnologia",
  },
  {
    name: "Tecnoblog",
    url: "https://tecnoblog.net/feed/",
    category: "Tecnologia",
  },
  {
    name: "Canaltech",
    url: "https://canaltech.com.br/rss/",
    category: "Tecnologia",
  },
  {
    name: "NASA",
    url: "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    category: "Ciência",
  },
  {
    name: "GE (Globo Esporte)",
    url: "https://ge.globo.com/rss/ge/",
    category: "Esportes",
  },
  {
    name: "Agência Brasil — Saúde",
    url: "https://agenciabrasil.ebc.com.br/rss/saude/feed.xml",
    category: "Saúde",
  },
  {
    name: "Natureza — Meio Ambiente",
    url: "https://www.wwf.org.br/rss.xml",
    category: "Meio Ambiente",
  },
  {
    name: "G1 — Natureza",
    url: "https://g1.globo.com/rss/g1/natureza/",
    category: "Meio Ambiente",
  },
  {
    name: "G1 — Pop & Arte",
    url: "https://g1.globo.com/rss/g1/pop-arte/",
    category: "Entretenimento",
  },
  {
    name: "G1 — Educação",
    url: "https://g1.globo.com/rss/g1/educacao/",
    category: "Educação",
  },
  {
    name: "Agência Brasil — Educação",
    url: "https://agenciabrasil.ebc.com.br/rss/educacao/feed.xml",
    category: "Educação",
  },
  {
    name: "Guia do Estudante",
    url: "https://guiadoestudante.abril.com.br/feed/",
    category: "Educação",
  },
  {
    name: "Revista Educação",
    url: "https://revistaeducacao.com.br/feed/",
    category: "Educação",
  },
  {
    name: "The Hacker News",
    url: "https://feeds.feedburner.com/TheHackersNews",
    category: "Cyber & IA",
  },
  {
    name: "Razões para Acreditar",
    url: "https://razoesparaacreditar.com/feed/",
    category: "Boas notícias",
  },
]

function createFallbackNews(): NewsItem[] {
  const now = Date.now()
  return [
    {
      id: "fallback-1",
      title: "Acompanhe os acontecimentos que movimentam o mundo",
      description:
        "Nossa redação digital reúne notícias de fontes públicas e confiáveis em um só lugar.",
      url: "https://www.bbc.com/portuguese",
      image: null,
      source: "BBC Brasil",
      category: "Mundo",
      publishedAt: new Date(now).toISOString(),
    },
    {
      id: "fallback-2",
      title: "Mercados globais analisam o novo cenário econômico",
      description:
        "Indicadores internacionais e decisões de bancos centrais seguem no radar dos investidores.",
      url: "https://agenciabrasil.ebc.com.br/economia",
      image: null,
      source: "Agência Brasil",
      category: "Economia",
      publishedAt: new Date(now - 30 * 60_000).toISOString(),
    },
    {
      id: "fallback-3",
      title: "Tecnologia transforma a forma como informação circula",
      description:
        "Novas ferramentas ampliam o acesso ao conhecimento e mudam hábitos ao redor do planeta.",
      url: "https://olhardigital.com.br/",
      image: null,
      source: "Olhar Digital",
      category: "Tecnologia",
      publishedAt: new Date(now - 60 * 60_000).toISOString(),
    },
    {
      id: "fallback-4",
      title: "Ciência abre novas janelas para observar o universo",
      description:
        "Missões e observatórios avançam na busca por respostas sobre o espaço profundo.",
      url: "https://www.nasa.gov/news/",
      image: null,
      source: "NASA",
      category: "Ciência",
      publishedAt: new Date(now - 90 * 60_000).toISOString(),
    },
  ]
}

export const FALLBACK_NEWS: NewsItem[] = createFallbackNews()

function codePointToString(value: number): string {
  return Number.isFinite(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : ""
}

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  // Portuguese accents and special characters
  "&aacute;": "á", "&Aacute;": "Á",
  "&acirc;": "â", "&Acirc;": "Â",
  "&agrave;": "à", "&Agrave;": "À",
  "&aring;": "å", "&Aring;": "Å",
  "&atilde;": "ã", "&Atilde;": "Ã",
  "&auml;": "ä", "&Auml;": "Ä",
  "&ccedil;": "ç", "&Ccedil;": "Ç",
  "&eacute;": "é", "&Eacute;": "É",
  "&ecirc;": "ê", "&Ecirc;": "Ê",
  "&egrave;": "è", "&Egrave;": "È",
  "&euml;": "ë", "&Euml;": "Ë",
  "&iacute;": "í", "&Iacute;": "Í",
  "&icirc;": "î", "&Icirc;": "Î",
  "&igrave;": "ì", "&Igrave;": "Ì",
  "&iuml;": "ï", "&Iuml;": "Ï",
  "&ntilde;": "ñ", "&Ntilde;": "Ñ",
  "&oacute;": "ó", "&Oacute;": "Ó",
  "&ocirc;": "ô", "&Ocirc;": "Ô",
  "&ograve;": "ò", "&Ograve;": "Ò",
  "&otilde;": "õ", "&Otilde;": "Õ",
  "&ouml;": "ö", "&Ouml;": "Ö",
  "&uacute;": "ú", "&Uacute;": "Ú",
  "&ucirc;": "û", "&Ucirc;": "Û",
  "&ugrave;": "ù", "&Ugrave;": "Ù",
  "&uuml;": "ü", "&Uuml;": "Ü",
  // Punctuation and symbols
  "&bull;": "•",
  "&hellip;": "…",
  "&ndash;": "–",
  "&mdash;": "—",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&laquo;": "«",
  "&raquo;": "»",
  "&deg;": "°",
  "&ordm;": "º",
  "&orda;": "ª",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&euro;": "€",
}

const HEX_ENTITY = /&#x([0-9a-fA-F]+);/g
const DEC_ENTITY = /&#(\d+);/g

export function decodeEntities(value: string): string {
  let text = value
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    text = text.split(entity).join(char)
  }
  text = text.replace(HEX_ENTITY, (_, hex) => codePointToString(Number.parseInt(hex, 16)))
  text = text.replace(DEC_ENTITY, (_, dec) => codePointToString(Number.parseInt(dec, 10)))
  return text
}

// Leaked HTML attribute key-value pairs from WordPress feed images (e.g. data-image-caption="...", data-large-file="...")
const LEAKED_ATTR_REGEX =
  /(?:^|\s)(?:data-[a-z0-9_-]+|srcset|sizes|width|height|alt|src|class|style|id|loading|decoding|referrerpolicy)=(?:"[^"]*"|'[^']*'|\S+)/gi

// Boilerplate call-to-action phrases frequently appended to RSS feed descriptions/titles
const BOILERPLATE_REGEX =
  /\s*(?:(?:clique|acesse|saiba|leia|confira|veja|assista|ouça)\s+(?:aqui|mais|na íntegra|no site|o vídeo|o áudio|a matéria|a reportagem)|leia mais|saiba mais|confira|veja mais|matéria completa|notícia completa|foto:|\[\+\]|\.\.\.)\s*\.?$/gi

// Some feeds (e.g. Agência Brasil) double-encode embedded HTML, so literal
// tags survive as "&lt;p&gt;" after the XML parser's single decode pass.
// Decode entities and strip tags across two passes to unwrap that safely.
export function plainText(value: unknown): string {
  if (typeof value !== "string") return ""
  let text = value
  // Strip embedded script and style elements first to prevent script/style blocks from bleeding into description text
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  for (let pass = 0; pass < 2; pass += 1) {
    text = decodeEntities(text).replace(/<[^>]*>/g, " ")
  }
  // Strip leaked HTML attribute key-value pairs from WordPress feed images
  text = text.replace(LEAKED_ATTR_REGEX, " ")
  // Some publishers (seen in Globo/GE descriptions) leak a JavaScript object
  // straight into the feed, so the text literally contains "[object Object]".
  // Strip it and any trailing boilerplate call-to-action ("Clique aqui", etc.).
  return text
    .replace(/\[object Object\]/gi, " ")
    .replace(BOILERPLATE_REGEX, "")
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
}

// Lowercase and strip diacritics so "eleicao" matches "eleição" in search.
export function normalize(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// Trim to at most maxLength characters without cutting a word in half. If a
// space is reasonably close to the limit we cut there; otherwise (a single very
// long token) we hard-cut. Trailing punctuation/whitespace is stripped before
// the ellipsis so we never get "palavra ,\u2026" or "palavra\u2014\u2026".
// If text does not end with terminal punctuation (. ! ?), an ellipsis is added
// so descriptions never appear cut off "no seco".
export function truncate(text: string, maxLength: number): string {
  const cleaned = plainText(text)
  if (!cleaned) return ""
  if (cleaned.length > maxLength) {
    const clipped = cleaned.slice(0, maxLength)
    const lastSpace = clipped.lastIndexOf(" ")
    const base = lastSpace > maxLength * 0.5 ? clipped.slice(0, lastSpace) : clipped
    return `${base.replace(/[\s.,;:!?\u2014\u2013-]+$/, "")}\u2026`
  }
  // Append ellipsis if sentence does not end with terminal punctuation
  if (!/[.!?]$/.test(cleaned)) {
    return `${cleaned.replace(/[\s.,;:!?\u2014\u2013-]+$/, "")}\u2026`
  }
  return cleaned
}

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

export function inferCategory(
  title: string,
  fallback: FeedSource["category"],
): FeedSource["category"] {
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
