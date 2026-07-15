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

## Segurança

- **Cabeçalhos HTTP**: `next.config.mjs` define `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy` para todas as rotas.
- **Sem SSRF**: a rota `/api/news` só faz `fetch` para uma lista fixa de feeds (`FEED_SOURCES`) e para o domínio fixo `news.google.com`; a entrada do usuário (`q`) é sempre passada como parâmetro de URL codificado, nunca como host/URL arbitrário.
- **Sem XSS via conteúdo externo**: título/descrição das notícias são renderizados como texto pelo React (nunca `dangerouslySetInnerHTML`), então HTML vindo dos feeds não é executado.
- **Dados do usuário**: favoritos, histórico de busca e tema ficam apenas em `localStorage` do navegador — nada é enviado a um servidor próprio.
- **Recomendação para produção**: a rota `/api/news` não tem rate limiting próprio (usa apenas o cache de 5 minutos do Next.js). Se o tráfego crescer, considere adicionar um rate limit por IP (ex. Vercel Firewall/KV) para evitar abuso das buscas no Google News.

## Notas

- `pnpm lint` e `pnpm build` (com verificação de tipos) devem passar limpos antes de qualquer deploy.
- O ícone do site usa os arquivos em `public/` (`icon.svg`, `icon-light-32x32.png`, `icon-dark-32x32.png`, `apple-icon.png`), referenciados em `app/layout.tsx`.
