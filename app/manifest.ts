import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Órbita — Notícias do mundo ao vivo",
    short_name: "Órbita",
    description: "As principais notícias do Brasil e do mundo, reunidas de fontes públicas e atualizadas ao vivo.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "pt-BR",
    categories: ["news", "magazines"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
