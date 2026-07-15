export const NEWS_CATEGORIES = [
  "Todas",
  "Mundo",
  "Política",
  "Economia",
  "Tecnologia",
  "Ciência",
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
]

export const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "fallback-1",
    title: "Acompanhe os acontecimentos que movimentam o mundo",
    description:
      "Nossa redação digital reúne notícias de fontes públicas e confiáveis em um só lugar.",
    url: "https://www.bbc.com/portuguese",
    image: null,
    source: "BBC Brasil",
    category: "Mundo",
    publishedAt: new Date().toISOString(),
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
    publishedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
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
    publishedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
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
    publishedAt: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
]

export function plainText(value: unknown): string {
  if (typeof value !== "string") return ""
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

export function stableId(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash).toString(36)
}

export function inferCategory(
  title: string,
  fallback: FeedSource["category"],
): FeedSource["category"] {
  const normalized = title.toLocaleLowerCase("pt-BR")
  if (/econom|mercado|inflação|banco|juros|empresa|negócio/.test(normalized)) return "Economia"
  if (/tecnolog|digital|internet|inteligência artificial|software|celular/.test(normalized)) return "Tecnologia"
  if (/ciência|espaço|nasa|pesquisa|clima|saúde|estudo/.test(normalized)) return "Ciência"
  if (/cultura|cinema|música|livro|arte|festival/.test(normalized)) return "Cultura"
  if (/governo|eleição|presidente|congresso|política|ministro/.test(normalized)) return "Política"
  return fallback
}
