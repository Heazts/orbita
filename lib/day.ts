// The calendar day, counted in Brasília time.
//
// The daily games used `Math.floor(Date.now() / 86_400_000)`, which counts UTC
// days. Brazil is UTC−3, so the "word of the day" changed at 21:00 local time:
// a reader playing at 22:00 on Monday got Tuesday's word, and the message
// "volte amanhã" was already wrong. Everything the site shows the reader is
// formatted in America/Sao_Paulo, so the day the games turn over on should be
// the same one.

const DAY_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// Whole days since the Unix epoch, where a "day" starts at midnight in
// Brasília. Only used to compare and index — never as a real timestamp.
export function brasiliaDay(date: Date = new Date()): number {
  const parts = DAY_PARTS.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return Math.floor(Date.UTC(get("year"), get("month") - 1, get("day")) / 86_400_000)
}
