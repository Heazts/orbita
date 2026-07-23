export const NEWS_CATEGORIES = [
  "Todas",
  "Mundo",
  "Política",
  "Economia",
  "Tecnologia",
  "Ciência",
  "Saúde",
  "Esportes",
  "Cultura",
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
}

export type NewsResponse = {
  items: NewsItem[]
  updatedAt: string
  sourceCount: number
  isFallback?: boolean
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
    name: "DW Brasil",
    url: "https://rss.dw.com/rdf/rss-br-all",
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
    name: "Olhar Digital",
    url: "https://olhardigital.com.br/feed/",
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

// Some feeds (e.g. Agência Brasil) double-encode embedded HTML, so literal
// tags survive as "&lt;p&gt;" after the XML parser's single decode pass.
// Decode entities and strip tags across two passes to unwrap that safely.
export function plainText(value: unknown): string {
  if (typeof value !== "string") return ""
  let text = value
  for (let pass = 0; pass < 2; pass += 1) {
    text = decodeEntities(text).replace(/<[^>]*>/g, " ")
  }
  return text.replace(/\s+/g, " ").trim()
}

// Lowercase and strip diacritics so "eleicao" matches "eleição" in search.
export function normalize(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function inferCategory(
  title: string,
  fallback: FeedSource["category"],
): FeedSource["category"] {
  const normalized = normalize(title)
  const rules: Array<{ test: RegExp; category: FeedSource["category"] }> = [
    { test: /econom|mercado|inflacao|banco|juros|empresa|negocio/, category: "Economia" },
    { test: /tecnolog|digital|internet|inteligencia artificial|software|celular/, category: "Tecnologia" },
    { test: /saude|vacina|hospital|doenca|medic|remedio|sus|virus|pandemia/, category: "Saúde" },
    { test: /futebol|copa|olimpi|campeonato|jogador|tecnico|placar|gol|esporte|atleta/, category: "Esportes" },
    { test: /ciencia|espaco|nasa|pesquisa|clima|estudo|astronomia/, category: "Ciência" },
    { test: /cultura|cinema|musica|livro|arte|festival/, category: "Cultura" },
    { test: /governo|eleicao|presidente|congresso|politica|ministro/, category: "Política" },
  ]
  const match = rules.find(({ test }) => test.test(normalized))
  return match?.category ?? fallback
}
