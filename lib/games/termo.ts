// Pure logic for the "Termo" word game (Portuguese Wordle). Kept free of React
// so it can be unit-tested in isolation.

export const WORD_LENGTH = 5
export const MAX_ATTEMPTS = 6

export type LetterResult = "correct" | "present" | "absent"

// Accent-free 5-letter Portuguese words. Answers are stored without diacritics
// so evaluation is a plain A–Z comparison and guesses can ignore accents.
export const ANSWERS: readonly string[] = [
  "PRAIA", "LIVRO", "PORTA", "VERDE", "PRATO", "CARTA", "MUNDO", "NOITE",
  "TERRA", "FESTA", "GRUPO", "PONTE", "VIDRO", "CAMPO", "BANHO", "FRUTA",
  "NAVIO", "TRIGO", "MOLHO", "PEDRA", "FORTE", "LARGO", "CURTO", "SALTO",
  "PULSO", "MENTE", "RISCO", "SONHO", "VOLTA", "CANTO", "PLANO", "CLARO",
  "BRAVO", "LIMPO", "VELHO", "JOVEM", "PRETO", "MARES", "DENTE", "GENTE",
  "LEITE", "PEIXE", "CARNE", "VERBO", "LETRA", "PAPEL", "METAL", "TEMPO",
  "VENTO", "CHUVA", "NUVEM", "SOLAR", "VINHO", "QUEDA", "AMIGO", "NADAR",
]

// Strip accents/diacritics, uppercase, and keep only A–Z. Used on player input.
export function normalizeGuess(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
}

export function isValidGuess(value: string): boolean {
  return normalizeGuess(value).length === WORD_LENGTH
}

// Scores a guess against the answer with correct duplicate-letter handling:
// exact matches are marked first and consume a letter from the answer's pool,
// so a second copy of a letter only shows "present" if the answer still has an
// unmatched instance of it.
export function evaluateGuess(guess: string, answer: string): LetterResult[] {
  const g = normalizeGuess(guess)
  const a = answer.toUpperCase()
  const result: LetterResult[] = new Array(a.length).fill("absent")
  const remaining: Record<string, number> = {}
  for (const ch of a) remaining[ch] = (remaining[ch] ?? 0) + 1

  for (let i = 0; i < a.length; i += 1) {
    if (g[i] === a[i]) {
      result[i] = "correct"
      remaining[g[i]] -= 1
    }
  }
  for (let i = 0; i < a.length; i += 1) {
    if (result[i] === "correct") continue
    const ch = g[i]
    if (ch && remaining[ch] > 0) {
      result[i] = "present"
      remaining[ch] -= 1
    }
  }
  return result
}

export function isWin(results: LetterResult[]): boolean {
  return results.length > 0 && results.every((r) => r === "correct")
}

// Whole days elapsed since the Unix epoch in the given timezone-naive local date.
function dayNumber(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000)
}

// Deterministic "word of the day": everyone gets the same answer on the same
// calendar day, and it only repeats after the whole list has been used.
export function dailyAnswer(date: Date = new Date()): string {
  const index = ((dayNumber(date) % ANSWERS.length) + ANSWERS.length) % ANSWERS.length
  return ANSWERS[index]
}

// Aggregates the best result seen for each letter across all guesses, for the
// on-screen keyboard hints. "correct" outranks "present" outranks "absent".
export function keyboardHints(
  guesses: { guess: string; results: LetterResult[] }[],
): Record<string, LetterResult> {
  const rank: Record<LetterResult, number> = { absent: 0, present: 1, correct: 2 }
  const hints: Record<string, LetterResult> = {}
  for (const { guess, results } of guesses) {
    const letters = normalizeGuess(guess)
    for (let i = 0; i < letters.length; i += 1) {
      const ch = letters[i]
      const next = results[i]
      if (!hints[ch] || rank[next] > rank[hints[ch]]) hints[ch] = next
    }
  }
  return hints
}
