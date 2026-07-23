"use client"

import { useState } from "react"

type NewsImageProps = {
  src: string
  lead?: boolean
}

export function NewsImage({ src, lead }: NewsImageProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={lead ? "aspect-video w-full rounded-lg object-cover" : "aspect-square size-20 shrink-0 rounded-lg object-cover sm:size-24"}
    />
  )
}
