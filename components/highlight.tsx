"use client"

import { Fragment, useMemo } from "react"

type HighlightProps = {
  text: string
  query: string
}

export function Highlight({ text, query }: HighlightProps) {
  const compiled = useMemo(() => {
    const terms = query.trim().split(/\s+/).filter((term) => term.length > 1)
    if (!terms.length) return null
    const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    const pattern = `(${escaped.join("|")})`
    return {
      regex: new RegExp(pattern, "gi"),
      matches: new RegExp(`^${pattern}$`, "i"),
    }
  }, [query])

  if (!compiled) return <>{text}</>

  return (
    <>
      {text.split(compiled.regex).map((part, index) =>
        compiled.matches.test(part) ? (
          <mark key={`${part}-${index}`} className="rounded-sm bg-accent px-0.5 text-accent-foreground">
            {part}
          </mark>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        ),
      )}
    </>
  )
}
