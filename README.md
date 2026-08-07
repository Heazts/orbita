# Órbita — Notícias do mundo ao vivo

Painel de notícias em português que agrega manchetes de 22 fontes públicas (lista completa em [Fontes](#fontes)) e permite pesquisar qualquer assunto via Google News. Construído com Next.js (App Router) e React.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- React 19
- Tailwind CSS 4
- [SWR](https://swr.vercel.app/) para busca e revalidação de dados no cliente
- `fast-xml-parser` para interpretar os feeds RSS/Atom no servidor

## Como rodar

Requer Node.js 20+ e [pnpm](https://pnpm.io/).

```bash
pnpm install       # instala as dependências
pnpm dev           # ambiente de desenvolvimento em http://localhost:3000
pnpm lint          # ESLint (regras do Next.js + TypeScript)
pnpm test          # testes unitários em modo watch (Vitest)
pnpm test:run      # testes unitários uma vez (usado no CI)
pnpm build         # build de produção (roda o type-check do TypeScript)
pnpm start         # serve o build de produção
```

## Estrutura

```
app/
  api/news/route.ts   # parseia query params, aplica rate limit e chama lib/aggregate.ts
  api/finance/route.ts # busca cotações no servidor (mesma origem, evita bloqueio de CSP)
  api/health/route.ts  # estado de cada feed (ok/desatualizado/fora do ar) para monitoramento
  layout.tsx           # metadados, fontes e tema
  page.tsx              # Server Component: busca a visão padrão e renderiza a home com dados reais (SSR)
components/
  news-dashboard.tsx   # interface do painel (estado de UI e busca/filtros), recebe initialData do servidor
hooks/
  use-favorites.ts      # favoritos persistidos em localStorage
  use-search-history.ts # histórico de busca persistido em localStorage
  use-url-query.ts      # espelha a busca ativa na URL (compartilhável, com voltar/avançar)
  use-theme.ts           # tema claro/escuro
  use-now.ts             # relógio para timestamps relativos ("há 5 min")
lib/
  news.ts               # tipos, fontes de feed, categorias e utilitários de texto
  parse.ts              # parsing de RSS/Atom e cálculo de relevância (testável)
  aggregate.ts          # busca feeds + Google News, dedupe/cluster, filtra e ordena — usado pela rota e pela home (SSR)
  clustering.ts          # agrupa notícias equivalentes de fontes diferentes (similaridade de Jaccard)
  rate-limit.ts          # rate limit por IP: em memória, ou distribuído via Upstash Redis
  storage.ts             # helpers de leitura/escrita em localStorage
  site.ts               # constantes do site (URL, título, descrição)
proxy.ts                 # CSP com nonce por request (convenção "proxy" do Next 16)
tests/
  news.test.ts          # testes de lib/news.ts
  parse.test.ts         # testes de lib/parse.ts (com fixtures de feed)
  clustering.test.ts    # testes de lib/clustering.ts (agrupamento e Jaccard)
  rate-limit.test.ts    # testes de lib/rate-limit.ts
  hooks/                 # testes dos hooks (ambiente jsdom + Testing Library)
```

## Responsividade

A interface é mobile-first com Tailwind (`sm:`/`md:`/`lg:`), testada em 320px, 390px (mobile) e 1440px (desktop) sem overflow horizontal. O layout principal vira uma única coluna no celular e usa grid de duas colunas (conteúdo + destaque) em telas largas (`lg:`).

## Funcionalidades

- Agrega fontes públicas de mundo, política, economia, tecnologia, ciência, esportes, saúde, educação, meio ambiente, entretenimento, cibersegurança e boas notícias, com busca global via Google News. A lista canônica está em [Fontes](#fontes).
- Categorias: Mundo, Boas notícias, Política, Economia, Tecnologia, Cyber & IA, Ciência, Educação, Saúde, Esportes, Cultura, Entretenimento e Meio Ambiente, inferidas por palavra-chave a partir do título/descrição. **Boas notícias** é a exceção: descreve o veículo, não o assunto, então vem sempre da fonte — inferir por palavra-chave só conseguia esvaziá-la.
- **Renderizada no servidor**: a home busca a visão padrão em `app/page.tsx` (Server Component) e entrega HTML com manchetes reais na primeira resposta — o painel interativo (`NewsDashboard`) hidrata sobre esses dados em vez de partir de uma tela vazia, o que melhora o LCP e mantém o conteúdo visível mesmo sem JavaScript.
- **Agrupamento de notícias equivalentes**: a mesma notícia coberta por fontes diferentes (títulos e URLs distintos) é agrupada por similaridade de texto (`lib/clustering.ts`) em vez de aparecer duplicada; o card líder do grupo mostra um selo "N fontes" com as demais fontes no tooltip.
- **Curadoria equilibrada na home**: a visão inicial (sem filtro) abre com um destaque leve e variado e mantém o topo diverso, sem começar por uma sequência de notícias pesadas — nada é escondido, só reordenado (`curateHomepage`). Ao pesquisar, filtrar ou entrar no modo ao vivo, a ordem cronológica/relevância é respeitada.
- **Preferências (só no navegador)**: painel para escolher o **tema** (Claro, Escuro ou Sistema — que acompanha o aparelho ao vivo), o *tom das notícias* (Equilibrado, que esconde notícias pesadas ao navegar, ou Completo), ligar/desligar os *avisos de novas matérias* e *reduzir animações*, além de **limpar o histórico de busca** com um clique. Persistidas em `localStorage` (`hooks/use-preferences.ts`, `hooks/use-theme.ts`).
- **Páginas de políticas**: `/privacidade` e `/termos` (estáticas, linkadas no rodapé), descrevendo honestamente que não há cadastro e que os dados ficam só no navegador.
- **Jogos** (`/jogos`): uma pausa leve entre as notícias — **Termo** (palavra do dia igual para todos, com progresso do dia salvo, modo livre para treinar, estatísticas de vitórias/sequência e compartilhamento do resultado em emojis sem spoiler) e **Sudoku** (níveis Fácil/Médio/Difícil, cronômetro, melhor tempo por nível e destaque de conflitos ao vivo). A lógica dos jogos fica em `lib/games/` e é 100% testada (`tests/games/`); estatísticas e recordes ficam só no `localStorage`.
- Busca insensível a acentos (ex.: "eleicao" encontra "eleição") que sempre preserva os resultados do Google. Aceita deep link `?q=termo` (também alvo do `SearchAction` no JSON-LD), gerando URLs de busca compartilháveis.
- Filtros por categoria, período, fonte e ordenação (mais recentes/mais relevantes); favoritos (com contador) e histórico de busca persistidos em `localStorage`.
- Quando alguma fonte de feed está indisponível, um aviso discreto lista quais fontes falharam (o payload da API expõe `failedSources`), sem quebrar o restante do painel.
- **Nada de notícia inventada**: se *todas* as fontes falharem, o painel diz que não conseguiu carregar e oferece nova tentativa — nunca preenche o espaço com manchetes fabricadas. O payload marca `sourcesUnavailable`, o que distingue uma queda de fontes de um filtro que não encontrou nada.
- **Monitoramento de fontes** (`/api/health`): estado de cada feed — `ok`, `stale` (responde mas não publica há mais de 48h) ou `down` — além das categorias que ficaram sem nenhuma fonte funcionando. Responde 503 só quando *todas* caem; falha parcial fica em 200 com `status: "degraded"`. Lê o mesmo cache de 5 minutos das páginas, então consultar não gera requisição extra às fontes. O cron de ingestão registra as falhas em log de erro em vez de devolvê-las num JSON que ninguém lê.
- Miniaturas de imagem nas notícias quando o feed original fornece uma (com fallback silencioso se a imagem não carregar).
- Estados de carregamento com skeletons, botão "voltar ao topo" e atalho de teclado `/` para focar a busca.
- Tema claro/escuro (incluindo um modo escuro bem próximo do preto) com persistência da preferência do usuário.
- **PWA instalável**: manifest, ícones (192/512, incl. maskable) e service worker (`public/sw.js`), então o navegador oferece "Instalar Órbita" e o app funciona offline (shell em cache; a API de notícias nunca é cacheada).
- **SEO**: `robots.txt`, `sitemap.xml`, metadados Open Graph/Twitter, URL canônica e dados estruturados JSON-LD (schema.org `WebSite`), gerados por `app/robots.ts`, `app/sitemap.ts` e `app/layout.tsx`.

## Fontes

<!-- FEED_SOURCES:start -->
<!-- Gerado a partir de FEED_SOURCES em lib/news.ts. tests/readme.test.ts
     falha se as duas listas divergirem. Não edite à mão. -->

| Fonte | Categoria |
| --- | --- |
| BBC Brasil | Mundo |
| CNN Brasil | Mundo |
| Euronews | Mundo |
| Agência Brasil | Política |
| Poder360 | Política |
| InfoMoney | Economia |
| Exame | Economia |
| Agência Brasil — Economia | Economia |
| G1 — Economia | Economia |
| Olhar Digital | Tecnologia |
| Tecnoblog | Tecnologia |
| Canaltech | Tecnologia |
| NASA | Ciência |
| GE (Globo Esporte) | Esportes |
| Agência Brasil — Saúde | Saúde |
| Natureza — Meio Ambiente | Meio Ambiente |
| G1 — Natureza | Meio Ambiente |
| G1 — Pop & Arte | Entretenimento |
| G1 — Educação | Educação |
| Agência Brasil — Educação | Educação |
| Guia do Estudante | Educação |
| Revista Educação | Educação |
| The Hacker News | Cyber & IA |
| Razões para Acreditar | Boas notícias |

<!-- FEED_SOURCES:end -->

## Segurança

- **Cabeçalhos HTTP**: `proxy.ts` define a `Content-Security-Policy` com nonce por request; `next.config.mjs` define `Strict-Transport-Security` (HSTS), `Cross-Origin-Opener-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy` para todas as rotas. `X-Powered-By` é desativado para não expor o framework.
- **Automação (GitHub)**: em `.github/workflows/` — CI (lint + testes + build), **CodeQL** (SAST em cada PR e semanal), **Dependency Review** (bloqueia PRs que adicionam dependências com CVE alto) e **OSV-Scanner** (audita o `pnpm-lock.yaml` contra a base OSV — usado no lugar do `pnpm audit`, cujo endpoint foi descontinuado, e do lockfile npm regenerado, que ignora os overrides de pnpm). O **Dependabot** (`.github/dependabot.yml`) abre PRs de atualização e o workflow `dependabot-auto-merge` faz merge automático de patch/minor quando o CI passa.
- **Ajustes a habilitar no GitHub** (Settings → Code security, grátis em repositório público): *Secret Scanning* + *Push Protection*, *Dependabot alerts* e *Dependabot security updates*. Para o auto-merge funcionar, ligue *Allow auto-merge* e uma regra de proteção do branch `main` exigindo os checks de CI.
- **Rate limiting**: cada rota tem seu próprio orçamento por IP, para que uma não esgote a outra — `/api/news` e `/api/health` ~30/min, `/api/img-proxy` 300/min, `/api/csp-report` e `/api/finance` 60/min. O limite de imagens foi dimensionado por medição em navegador: abrir a home pede 6 imagens e rolar a lista inteira pede 100, uma por cartão; 300 permite três passagens completas por minuto. É best-effort **por instância** — configure `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` para um contador compartilhado entre instâncias (o código já usa quando presentes).
- **Variáveis de ambiente**: `CRON_SECRET` é **obrigatória em produção** — sem ela `/api/cron/ingest` responde 503 e o cache não é aquecido. As demais são opcionais e estão documentadas em `.env.example`.
- **Sem SSRF**: a rota `/api/news` só faz `fetch` para uma lista fixa de feeds (`FEED_SOURCES`) e para o domínio fixo `news.google.com`; a entrada do usuário (`q`) é sempre passada como parâmetro de URL codificado, nunca como host/URL arbitrário.
- **Sem XSS via conteúdo externo**: título/descrição das notícias são renderizados como texto pelo React (nunca `dangerouslySetInnerHTML`), então HTML vindo dos feeds não é executado. Feeds que colocam o próprio HTML duplamente escapado na descrição (visto na prática na Agência Brasil) são desembrulhados com segurança por `plainText()`/`decodeEntities()` em `lib/news.ts` antes de virar texto.
- **Imagens externas**: extraídas apenas de URLs `https://`; renderizadas com `<img>` simples (não `next/image`) de propósito — o otimizador de imagem do Next faria o próprio servidor buscar a URL externa arbitrária do feed, o que seria uma superfície de SSRF. `referrerPolicy="no-referrer"` evita vazar a origem do site para os hosts de imagem de terceiros.
- **Dados do usuário**: favoritos, histórico de busca, tema e preferências ficam apenas em `localStorage` do navegador — nada é enviado a um servidor próprio. O histórico pode ser apagado pelo próprio painel de preferências. As páginas `/privacidade` e `/termos` descrevem isso para o usuário.

## Testes

Testes unitários com [Vitest](https://vitest.dev/) cobrem os utilitários de texto (`lib/news.ts`: `decodeEntities`, `plainText`, `normalize`, `inferCategory`), o parsing de feeds (`lib/parse.ts`: `parseFeed`, `findImage`, `findLink`, `relevance`) com fixtures de RSS/Atom e do Google News, e o rate limiter (`lib/rate-limit.ts`). Rode com `pnpm test` (watch) ou `pnpm test:run` (uma vez, como no CI).

## Notas

- `pnpm lint`, `pnpm test:run` e `pnpm build` (com verificação de tipos) devem passar limpos antes de qualquer deploy.
- O ícone do site usa os arquivos em `public/` (`icon.svg`, `icon-light-32x32.png`, `icon-dark-32x32.png`, `apple-icon.png`), referenciados em `app/layout.tsx`.
