import { normalize, type NewsItem } from "@/lib/news"

/**
 * Quick summary of a feed item.
 *
 * This is *not* AI, and nothing here should imply that it is. It was
 * previously shipped as "Resumo & Análise de IA Local", with a robot icon and
 * a note about not sending data "para servidores externos de IA" — wording
 * that only makes sense if a model exists somewhere, which it does not. What
 * the code actually does is take the headline, split the feed's own
 * description on sentence boundaries, keep the first two, and count words for
 * a reading estimate. Useful, but it is extraction, not generation, and the
 * interface now says so.
 */

export type ToneLabel = "Informativo" | "Análise" | "Opinião" | "Comunicado oficial"

export type QuickSummary = {
  /** Headline plus the opening sentences, in reading order. */
  excerpts: SummaryExcerpt[]
  tone: ToneLabel
  /** True when the feed gave no usable description, so only the headline exists. */
  isHeadlineOnly: boolean
  wordCount: number
  readTimeMinutes: number
}

export type SummaryExcerpt = {
  label: string
  text: string
}

/**
 * Guesses an editorial register by looking for marker words.
 *
 * Keyword matching, nothing more: an article about a decree will be tagged
 * "Comunicado oficial" whether or not it is one, and an opinion column that
 * avoids the marker words will be tagged "Informativo". The UI presents the
 * result as an estimate rather than a fact for that reason.
 */
export function classifyTone(item: NewsItem): ToneLabel {
  const text = normalize(`${item.title} ${item.description} ${item.source}`)

  if (/oficial|comunicado|nota oficial|governo sanciona|decreto|boletim/.test(text)) {
    return "Comunicado oficial"
  }
  if (/opiniao|coluna|artigo|editorial|ponto de vista|avaliamos|na minha visao/.test(text)) {
    return "Opinião"
  }
  if (/entenda|veja o impacto|analise|por que|o que muda|perspectivas|cenario/.test(text)) {
    return "Análise"
  }
  return "Informativo"
}

// Average adult reading speed in Portuguese prose. Used only to set
// expectations, and rounded up so the estimate is never optimistic.
const WORDS_PER_MINUTE = 180

/**
 * Builds the quick summary. Pure and synchronous: no network request is made,
 * because there is nothing to request.
 */
export function buildQuickSummary(item: NewsItem): QuickSummary {
  const title = item.title.trim()
  const description = item.description.trim()

  const words = `${title} ${description}`.split(/\s+/).filter(Boolean).length
  const readTimeMinutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))

  // Split on sentence-ending punctuation followed by whitespace. Short
  // fragments are dropped: feed descriptions often end in a stray "Foto." or
  // an abbreviation that is not a sentence.
  const sentences = description
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 10)

  const excerpts: SummaryExcerpt[] = [{ label: "Manchete", text: title }]
  if (sentences[0]) excerpts.push({ label: "Trecho de abertura", text: sentences[0] })
  if (sentences[1]) excerpts.push({ label: "Continuação", text: sentences[1] })

  return {
    excerpts,
    tone: classifyTone(item),
    isHeadlineOnly: sentences.length === 0,
    wordCount: words,
    readTimeMinutes,
  }
}
