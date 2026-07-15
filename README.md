# Órbita — Notícias do mundo ao vivo

Painel de notícias em português que agrega manchetes de fontes públicas (BBC Brasil, DW Brasil, Euronews, Agência Brasil, Olhar Digital, NASA) e permite pesquisar qualquer assunto via Google News. Construído com Next.js (App Router) e React.

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
pnpm build         # build de produção (roda o type-check do TypeScript)
pnpm start         # serve o build de produção
```

## Estrutura

```
app/
  api/news/route.ts   # agrega os feeds RSS e a busca no Google News
  layout.tsx           # metadados, fontes e tema
  page.tsx              # ponto de entrada da página
components/
  news-dashboard.tsx   # toda a interface e o estado do painel
  ui/button.tsx        # componente de botão (shadcn)
lib/
  news.ts               # tipos, fontes de feed e utilitários de parsing
  utils.ts              # helper de classes (cn)
```

## Responsividade

A interface é mobile-first com Tailwind (`sm:`/`md:`/`lg:`), testada em 320px, 390px (mobile) e 1440px (desktop) sem overflow horizontal. O layout principal vira uma única coluna no celular e usa grid de duas colunas (conteúdo + destaque) em telas largas (`lg:`).

## Funcionalidades

- Agrega BBC Brasil, DW Brasil, Euronews, Agência Brasil, Olhar Digital e NASA, com busca global via Google News.
- Busca insensível a acentos (ex.: "eleicao" encontra "eleição") que sempre preserva os resultados do Google.
- Filtros por categoria, período, fonte e ordenação (mais recentes/mais relevantes); favoritos (com contador) e histórico de busca persistidos em `localStorage`.
- Miniaturas de imagem nas notícias quando o feed original fornece uma (com fallback silencioso se a imagem não carregar).
- Estados de carregamento com skeletons, botão "voltar ao topo" e atalho de teclado `/` para focar a busca.
- Tema claro/escuro (incluindo um modo escuro bem próximo do preto) com persistência da preferência do usuário.
- **PWA instalável**: manifest, ícones (192/512, incl. maskable) e service worker (`public/sw.js`), então o navegador oferece "Instalar Órbita" e o app funciona offline (shell em cache; a API de notícias nunca é cacheada).
- **SEO**: `robots.txt`, `sitemap.xml`, metadados Open Graph/Twitter, URL canônica e dados estruturados JSON-LD (schema.org `WebSite`), gerados por `app/robots.ts`, `app/sitemap.ts` e `app/layout.tsx`.

## Segurança

- **Cabeçalhos HTTP**: `next.config.mjs` define `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `Cross-Origin-Opener-Policy`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy` para todas as rotas. `X-Powered-By` é desativado para não expor o framework.
- **Automação (GitHub)**: Dependabot (`.github/dependabot.yml`) para atualizações de dependências, análise de código com CodeQL e um workflow de CI (lint + build) em `.github/workflows/`.
- **Rate limiting**: a rota `/api/news` limita a ~30 requisições/minuto por IP (best-effort, em memória por instância). Isso resolve o abuso casual; em produção com múltiplas instâncias, prefira um rate limit de borda (Vercel Firewall/KV, Upstash) para uma garantia mais forte.
- **Sem SSRF**: a rota `/api/news` só faz `fetch` para uma lista fixa de feeds (`FEED_SOURCES`) e para o domínio fixo `news.google.com`; a entrada do usuário (`q`) é sempre passada como parâmetro de URL codificado, nunca como host/URL arbitrário.
- **Sem XSS via conteúdo externo**: título/descrição das notícias são renderizados como texto pelo React (nunca `dangerouslySetInnerHTML`), então HTML vindo dos feeds não é executado. Feeds que colocam o próprio HTML duplamente escapado na descrição (visto na prática na Agência Brasil) são desembrulhados com segurança por `plainText()`/`decodeEntities()` em `lib/news.ts` antes de virar texto.
- **Imagens externas**: extraídas apenas de URLs `https://`; renderizadas com `<img>` simples (não `next/image`) de propósito — o otimizador de imagem do Next faria o próprio servidor buscar a URL externa arbitrária do feed, o que seria uma superfície de SSRF. `referrerPolicy="no-referrer"` evita vazar a origem do site para os hosts de imagem de terceiros.
- **Dados do usuário**: favoritos, histórico de busca e tema ficam apenas em `localStorage` do navegador — nada é enviado a um servidor próprio.

## Notas

- `pnpm lint` e `pnpm build` (com verificação de tipos) devem passar limpos antes de qualquer deploy.
- O ícone do site usa os arquivos em `public/` (`icon.svg`, `icon-light-32x32.png`, `icon-dark-32x32.png`, `apple-icon.png`), referenciados em `app/layout.tsx`.
