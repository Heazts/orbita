const CACHE = "orbita-v2"
const SHELL = ["/", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"]
const SHELL_PATHS = new Set(SHELL)

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
    )
    return
  }

  // Cache only the known PWA shell and immutable Next.js build assets. Caching
  // every same-origin GET lets arbitrary query strings consume the browser's
  // cache quota and can preserve responses that were never intended offline.
  const cacheable = SHELL_PATHS.has(url.pathname) || url.pathname.startsWith("/_next/static/")
  if (!cacheable) return

  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      }),
    ),
  )
})
