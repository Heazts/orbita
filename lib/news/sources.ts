/**
 * The feeds the aggregator reads.
 *
 * README.md documents this list and tests/readme.test.ts fails if the two
 * diverge — for a news aggregator the source list is a factual claim to its
 * readers, not decoration.
 *
 * There is deliberately no placeholder article list here. This file used to
 * export four invented headlines attributed to BBC Brasil, Agência Brasil,
 * Olhar Digital and NASA, stamped with the current time and linking to those
 * outlets' home pages. They were shown whenever every feed failed — so the site
 * fabricated news precisely when it was broken. An honest empty state is in
 * components/empty-state.tsx.
 */

import type { FeedSource } from "./types"

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
  // Two more for Economia, which had only InfoMoney and Exame — both business
  // magazines. Agência Brasil brings the public-sector view and G1 the general
  // one, so the category stops being two outlets with the same editorial angle.
  //
  // Both URLs follow the exact path pattern of feeds already in this list
  // (agenciabrasil …/rss/<editoria>/feed.xml, g1 …/rss/g1/<editoria>/), which is
  // why they are here without a live check — /api/health reports the truth after
  // deploy, and a source that 403s shows up there rather than failing silently.
  {
    name: "Agência Brasil — Economia",
    url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml",
    category: "Economia",
  },
  {
    name: "G1 — Economia",
    url: "https://g1.globo.com/rss/g1/economia/",
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
