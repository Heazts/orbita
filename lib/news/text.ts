/**
 * Turning third-party feed markup into plain text.
 *
 * Everything here runs on untrusted input: feed bodies are attacker-influenced
 * and bounded only by the 5 MB cap in lib/aggregate.ts. Two consequences are
 * load-bearing and documented at their call sites — the HTML stripper is a
 * hand-written scanner rather than a regex, and plainText collapses whitespace
 * before the boilerplate pattern runs, because doing it the other way round was
 * quadratic.
 */

function codePointToString(value: number): string {
  return Number.isFinite(value) && value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : ""
}

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  // Portuguese accents and special characters
  "&aacute;": "á", "&Aacute;": "Á",
  "&acirc;": "â", "&Acirc;": "Â",
  "&agrave;": "à", "&Agrave;": "À",
  "&aring;": "å", "&Aring;": "Å",
  "&atilde;": "ã", "&Atilde;": "Ã",
  "&auml;": "ä", "&Auml;": "Ä",
  "&ccedil;": "ç", "&Ccedil;": "Ç",
  "&eacute;": "é", "&Eacute;": "É",
  "&ecirc;": "ê", "&Ecirc;": "Ê",
  "&egrave;": "è", "&Egrave;": "È",
  "&euml;": "ë", "&Euml;": "Ë",
  "&iacute;": "í", "&Iacute;": "Í",
  "&icirc;": "î", "&Icirc;": "Î",
  "&igrave;": "ì", "&Igrave;": "Ì",
  "&iuml;": "ï", "&Iuml;": "Ï",
  "&ntilde;": "ñ", "&Ntilde;": "Ñ",
  "&oacute;": "ó", "&Oacute;": "Ó",
  "&ocirc;": "ô", "&Ocirc;": "Ô",
  "&ograve;": "ò", "&Ograve;": "Ò",
  "&otilde;": "õ", "&Otilde;": "Õ",
  "&ouml;": "ö", "&Ouml;": "Ö",
  "&uacute;": "ú", "&Uacute;": "Ú",
  "&ucirc;": "û", "&Ucirc;": "Û",
  "&ugrave;": "ù", "&Ugrave;": "Ù",
  "&uuml;": "ü", "&Uuml;": "Ü",
  // Punctuation and symbols
  "&bull;": "•",
  "&hellip;": "…",
  "&ndash;": "–",
  "&mdash;": "—",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&laquo;": "«",
  "&raquo;": "»",
  "&deg;": "°",
  "&ordm;": "º",
  "&orda;": "ª",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&euro;": "€",
}

const HEX_ENTITY = /&#x([0-9a-fA-F]+);/g
const DEC_ENTITY = /&#(\d+);/g

export function decodeEntities(value: string): string {
  let text = value
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    text = text.split(entity).join(char)
  }
  text = text.replace(HEX_ENTITY, (_, hex) => codePointToString(Number.parseInt(hex, 16)))
  text = text.replace(DEC_ENTITY, (_, dec) => codePointToString(Number.parseInt(dec, 10)))
  return text
}

// Leaked HTML attribute key-value pairs from WordPress feed images (e.g. data-image-caption="...", data-large-file="...")
const LEAKED_ATTR_REGEX =
  /(?:^|\s)(?:data-[a-z0-9_-]+|srcset|sizes|width|height|alt|src|class|style|id|loading|decoding|referrerpolicy)=(?:"[^"]*"|'[^']*'|\S+)/gi

// Boilerplate call-to-action phrases frequently appended to RSS feed descriptions/titles
const BOILERPLATE_REGEX =
  /\s*(?:(?:clique|acesse|saiba|leia|confira|veja|assista|ouça)\s+(?:aqui|mais|na íntegra|no site|o vídeo|o áudio|a matéria|a reportagem)|leia mais|saiba mais|confira|veja mais|matéria completa|notícia completa|foto:|\[\+\]|\.\.\.)\s*\.?$/gi

type HtmlTag = {
  name: string
  closing: boolean
  selfClosing: boolean
}

function isHtmlWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r" || char === "\f"
}

function htmlTag(value: string): HtmlTag | null {
  let index = 0
  while (index < value.length && isHtmlWhitespace(value[index])) index += 1

  const closing = value[index] === "/"
  if (closing) {
    index += 1
    while (index < value.length && isHtmlWhitespace(value[index])) index += 1
  }

  const nameStart = index
  while (index < value.length) {
    const code = value.charCodeAt(index)
    const isLetter = (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
    const isDigit = code >= 48 && code <= 57
    if (!isLetter && !isDigit && value[index] !== ":" && value[index] !== "-") break
    index += 1
  }
  if (index === nameStart) return null

  let end = value.length - 1
  while (end >= index && isHtmlWhitespace(value[end])) end -= 1
  return {
    name: value.slice(nameStart, index).toLowerCase(),
    closing,
    selfClosing: value[end] === "/",
  }
}

// Linear markup removal for external feed content. Regex-based HTML filtering
// is both incomplete for malformed-but-browser-valid tags and vulnerable to
// pathological backtracking on large attacker-controlled descriptions.
function stripHtmlMarkup(value: string): string {
  const chunks: string[] = []
  let cursor = 0
  let suppressedTag: "script" | "style" | null = null

  while (cursor < value.length) {
    const tagStart = value.indexOf("<", cursor)
    if (tagStart === -1) {
      if (!suppressedTag) chunks.push(value.slice(cursor))
      break
    }

    if (!suppressedTag && tagStart > cursor) chunks.push(value.slice(cursor, tagStart))

    const tagEnd = value.indexOf(">", tagStart + 1)
    if (tagEnd === -1) {
      // An unmatched "<" is plain text, not executable markup.
      if (!suppressedTag) chunks.push(value.slice(tagStart))
      break
    }

    const tag = htmlTag(value.slice(tagStart + 1, tagEnd))
    if (suppressedTag) {
      if (tag?.closing && tag.name === suppressedTag) {
        suppressedTag = null
        chunks.push(" ")
      }
    } else {
      chunks.push(" ")
      if (tag && !tag.closing && !tag.selfClosing && (tag.name === "script" || tag.name === "style")) {
        suppressedTag = tag.name
      }
    }

    cursor = tagEnd + 1
  }

  return chunks.join("")
}

// Some feeds (e.g. Agência Brasil) double-encode embedded HTML, so literal
// tags survive as "&lt;p&gt;" after the XML parser's single decode pass.
// Decode entities and strip tags across two passes to unwrap that safely.
export function plainText(value: unknown): string {
  if (typeof value !== "string") return ""
  let text = value
  for (let pass = 0; pass < 2; pass += 1) {
    text = stripHtmlMarkup(decodeEntities(text))
  }
  // Strip leaked HTML attribute key-value pairs from WordPress feed images
  text = text.replace(LEAKED_ATTR_REGEX, " ")
  // Some publishers (seen in Globo/GE descriptions) leak a JavaScript object
  // straight into the feed, so the text literally contains "[object Object]".
  // Strip it and any trailing boilerplate call-to-action ("Clique aqui", etc.).
  //
  // Order matters for more than tidiness: the whitespace collapse must run
  // *before* BOILERPLATE_REGEX. That pattern both begins and ends with a
  // variable-width \s run anchored to $, so against an uncollapsed string the
  // engine retries every start offset and rescans the same whitespace each
  // time — quadratic in the length of the run. A feed description ending in a
  // long stretch of whitespace (descriptions are only bounded by the 5 MB feed
  // cap) stalled the event loop for seconds. Collapsing first bounds every \s
  // run to a single space, so the alternation fails on its first literal and
  // the whole pass is linear.
  return text
    .replace(/\[object Object\]/gi, " ")
    .replace(/\s+/g, " ")
    .replace(BOILERPLATE_REGEX, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim()
}

// Characters trimmed off the end of a truncated description so it never reads
// "palavra ,…" or "palavra—…".
const TRAILING_TRIM = new Set([
  " ", "\t", "\n", "\r", "\f", "\v",
  ".", ",", ";", ":", "!", "?", "—", "–", "-",
])

// Deliberately a backwards scan rather than /[...]+$/. That regex form has no
// left anchor, so the engine restarts it at every offset and the cost is
// quadratic in the trailing run. The inputs here are bounded by maxLength
// today, but the bound is the caller's to choose and nothing enforces it — a
// linear scan removes the sharp edge instead of relying on it staying small.
function trimTrailing(value: string): string {
  let end = value.length
  while (end > 0 && TRAILING_TRIM.has(value[end - 1])) end -= 1
  return end === value.length ? value : value.slice(0, end)
}

// Lowercase and strip diacritics so "eleicao" matches "eleição" in search.
export function normalize(value: string): string {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// Trim to at most maxLength characters without cutting a word in half. If a
// space is reasonably close to the limit we cut there; otherwise (a single very
// long token) we hard-cut. Trailing punctuation/whitespace is stripped before
// the ellipsis so we never get "palavra ,\u2026" or "palavra\u2014\u2026".
// If text does not end with terminal punctuation (. ! ?), an ellipsis is added
// so descriptions never appear cut off "no seco".
export function truncate(text: string, maxLength: number): string {
  const cleaned = plainText(text)
  if (!cleaned) return ""
  if (cleaned.length > maxLength) {
    const clipped = cleaned.slice(0, maxLength)
    const lastSpace = clipped.lastIndexOf(" ")
    const base = lastSpace > maxLength * 0.5 ? clipped.slice(0, lastSpace) : clipped
    return `${trimTrailing(base)}\u2026`
  }
  // Append ellipsis if sentence does not end with terminal punctuation
  if (!/[.!?]$/.test(cleaned)) {
    return `${trimTrailing(cleaned)}\u2026`
  }
  return cleaned
}
