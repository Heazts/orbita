"use client"

import { useState } from "react"

type NewsImageProps = {
  src: string
  alt: string
  lead?: boolean
}

export function NewsImage({ src, alt, lead }: NewsImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed) return null

  // Pass external HTTP/HTTPS images through our privacy-preserving image proxy
  const imageSrc = /^https?:\/\//i.test(src) && !src.startsWith("/api/img-proxy")
    ? `/api/img-proxy?url=${encodeURIComponent(src)}`
    : src

  return (
    <div className={`relative overflow-hidden ${lead ? "aspect-video w-full rounded-xl" : "size-20 shrink-0 rounded-xl sm:size-24"}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        // The lead image is the page's LCP candidate — lazy-loading it (the
        // previous unconditional behaviour) deprioritizes the exact resource
        // Core Web Vitals cares most about. Only non-lead thumbnails, which
        // are below the fold, should be lazy.
        loading={lead ? "eager" : "lazy"}
        fetchPriority={lead ? "high" : "auto"}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  )
}