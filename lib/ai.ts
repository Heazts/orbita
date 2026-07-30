import { normalize, type NewsItem } from "@/lib/news"

export type EditorialTone = "Informativo" | "Análise" | "Opinião" | "Comunicado Oficial"

export type LocalSummary = {
  bullets: string[]
  tone: EditorialTone
  wordCount: number
  readTimeMinutes: number
  privacyNote: string
}

/**
 * Classifies the editorial tone of an article using linguistic markers.
 */
export function inferEditorialTone(item: NewsItem): EditorialTone {
  const text = normalize(`${item.title} ${item.description} ${item.source}`)

  if (/oficial|comunicado|nota oficial|governo sanciona|decreto|boletim/.test(text)) {
    return "Comunicado Oficial"
  }
  if (/opiniao|coluna|artigo|editorial|ponto de vista|avaliamos|na minha visao/.test(text)) {
    return "Opinião"
  }
  if (/entenda|veja o impacto|analise|por que|o que muda|perspectivas|cenario/.test(text)) {
    return "Análise"
  }
  return "Informativo"
}

/**
 * Generates a 3-bullet takeaway summary of a news item 100% locally in the browser,
 * without sending any data to external AI servers.
 */
export function generateLocalSummary(item: NewsItem): LocalSummary {
  const title = item.title.trim()
  const desc = item.description.trim()

  const words = `${title} ${desc}`.split(/\s+/).length
  const readTimeMinutes = Math.max(1, Math.ceil(words / 180))

  // Break description into sentences
  const sentences = desc
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  const bullet1 = `📌 Manchete principal: "${title}"`
  const bullet2 = sentences[0]
    ? `💡 Fato principal: ${sentences[0]}`
    : `💡 Cobertura jornalística reportada por ${item.source}.`
  const bullet3 = sentences[1]
    ? `🔍 Detalhe importante: ${sentences[1]}`
    : `🔍 Notícia classificada na categoria ${item.category} com atualização ao vivo.`

  return {
    bullets: [bullet1, bullet2, bullet3],
    tone: inferEditorialTone(item),
    wordCount: words,
    readTimeMinutes,
    privacyNote: "🔒 100% processado no seu navegador — nenhum dado foi enviado para servidores externos de IA.",
  }
}
