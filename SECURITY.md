# Política de Segurança

## Versões suportadas

Apenas a versão implantada a partir do branch `main` recebe correções de segurança.

## Como reportar uma vulnerabilidade

Se você encontrar uma vulnerabilidade, **não abra uma issue pública**. Use uma
das opções abaixo:

- Abra um [Security Advisory privado](https://github.com/Heazts/orbita/security/advisories/new) no repositório.
- Ou entre em contato de forma privada com o mantenedor.

Descreva o problema, os passos para reproduzir e o impacto potencial. Faremos o
possível para responder rapidamente.

## Práticas de segurança do projeto

- Cabeçalhos HTTP de segurança (CSP, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) aplicados a todas as rotas.
- A API `/api/news` só busca em uma lista fixa de feeds e no Google News; a
  entrada do usuário nunca vira um host/URL arbitrário (sem SSRF).
- Conteúdo de feeds é renderizado como texto pelo React (sem `dangerouslySetInnerHTML`).
- Rate limiting best-effort na API.
- Dependências monitoradas por Dependabot e código analisado por CodeQL.
