// Allow overriding via env var so Vercel preview deployments use the correct
// canonical URL. Falls back to the production URL when the variable is absent.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://orbitanews.vercel.app"
export const SITE_NAME = "Órbita"
export const SITE_TITLE = "Órbita — Notícias do mundo ao vivo"
export const SITE_DESCRIPTION =
  "As principais notícias do Brasil e do mundo, reunidas de fontes públicas e atualizadas ao vivo."
