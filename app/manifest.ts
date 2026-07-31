import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Órbita — Notícias do mundo ao vivo",
    short_name: "Órbita",
    description: "As principais notícias do Brasil e do mundo, reunidas de fontes públicas e atualizadas ao vivo.",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    lang: "pt-BR",
    categories: ["news", "magazines"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // A distinct asset, not the "any" icon reused. Maskable icons are cropped
      // to a launcher-chosen shape, so the art has to be inset into a safe
      // zone; pointing "maskable" at the full-bleed icon meant Android clipped
      // the ring's corners off.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Estudantes", url: "/estudantes" },
      { name: "Jogos", url: "/jogos" },
    ],
  }
}
