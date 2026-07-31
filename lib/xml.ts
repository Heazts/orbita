// XML text serialization for the public RSS feed (app/feed.xml).
//
// Everything that flows through here originates in third-party RSS, so it is
// untrusted: a single byte that XML 1.0 disallows makes the *entire* document
// non-well-formed, and conforming feed readers reject the whole response rather
// than skipping the offending item.

// Characters XML 1.0 forbids outright (§2.2): the C0 controls other than tab,
// LF and CR, plus the two permanent noncharacters. Escaping cannot rescue
// them — "&#7;" is exactly as illegal as a raw BEL — so they have to be
// dropped rather than encoded.
const XML_INVALID_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

// Unpaired surrogates are equally illegal, but a *matched* pair is a valid
// astral character — emoji appear in headlines routinely — so a blanket
// \uD800-\uDFFF range would corrupt legitimate text. Only the lone halves go.
const LONE_SURROGATES =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/** Escapes a string for use as XML text or as a double-quoted attribute value. */
export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(XML_INVALID_CHARS, "")
    .replace(LONE_SURROGATES, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
