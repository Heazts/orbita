/**
 * The feeds the aggregator reads, and the canned items shown when every one of
 * them fails.
 *
 * README.md documents this list and tests/readme.test.ts fails if the two
 * diverge — for a news aggregator the source list is a factual claim to its
 * readers, not decoration.
 */

import type { FeedSource, NewsItem } from "./types"

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
