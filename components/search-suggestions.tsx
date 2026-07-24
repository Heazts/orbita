"use client"

// Recent searches first, then evergreen suggestions, deduplicated and capped so
// the row stays a single scrollable line.
const SUGGESTIONS = [
  "Inteligência artificial",
  "Brasil",
  "Economia mundial",
  "Mudanças climáticas",
  "Eleições",
  "Espaço",
]

const MAX_TERMS = 8

export function SearchSuggestions({
  history,
  onSelect,
}: {
  history: string[]
  onSelect: (term: string) => void
}) {
  const terms = [...history, ...SUGGESTIONS]
    .filter((term, index, all) => all.indexOf(term) === index)
    .slice(0, MAX_TERMS)

  return (
    <div className="mx-auto max-w-7xl px-5 pt-3 md:px-8">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {terms.map((term) => (
          <button
            key={term}
            type="button"
            onClick={() => onSelect(term)}
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}
