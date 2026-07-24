"use client"

import { useState } from "react"

type NewsImageProps = {
  src: string
  lead?: boolean
}

export function NewsImage({ src, lead }: NewsImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  return (
    <div className={`relative overflow-hidden ${lead ? "aspect-video w-full rounded-xl" : "size-20 shrink-0 rounded-xl sm:size-24"}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image would proxy the arbitrary feed URL through our optimizer (SSRF surface); plain <img> keeps the fetch client-side. */}
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}