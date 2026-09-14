/**
 * Offline shell for the home-screen app.
 *
 * The records already live in the browser, so the only thing standing between
 * a child and their tins on a plane is the page itself. This keeps a copy.
 *
 * Two rules, and the split matters:
 *   - the page goes to the network first, so a new deploy is picked up on the
 *     next launch rather than being pinned to whatever was cached;
 *   - built assets are content-hashed, so once fetched they can be served from
 *     the cache forever — a changed file arrives under a new name.
 */
const CACHE = 'pocket-money-v1'
const SHELL = ['/', '/index.html', '/coin.svg', '/apple-touch-icon.png', '/manifest.webmanifest']

// Typography is on Google's servers; without it the app falls back to system
// fonts offline, which is legible but not the same app.
const FONT_HOSTS = ['https://fonts.googleapis.com', 'https://fonts.gstatic.com']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // A missing file must not fail the whole install, so each is added alone.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin
  const isFont = FONT_HOSTS.includes(url.origin)
  if (!sameOrigin && !isFont) return // Supabase and anything else: untouched.

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((hit) => hit ?? caches.match('/'))),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit
      return fetch(request).then((response) => {
        // Opaque font responses are fine to keep; an error page is not.
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
