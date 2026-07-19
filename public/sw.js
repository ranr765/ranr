/* Service worker for Simple Serve.
   1. Web-push notifications (the morning inbox reminder).
   2. Caching so the app SHELL (app.js, css, logo, fonts) loads instantly on
      repeat opens, while business data (/api/*) is always fetched fresh. */

const CACHE = 'ss-shell-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // drop old shell caches
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return // never touch POST/PUT/DELETE
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // let cross-origin pass through

  // business data: always live, never cached
  if (url.pathname.startsWith('/api/')) return

  // the page itself: network-first so new deploys show up immediately,
  // fall back to cache when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    )
    return
  }

  // static assets (app.js, style.css, logo, manifest…): stale-while-revalidate —
  // serve instantly from cache, refresh in the background
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})

// ---------- push notifications ----------

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Simple Serve', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Simple Serve'
  const options = {
    body: data.body || '',
    icon: '/static/logo.png',
    badge: '/static/logo.png',
    tag: data.tag || 'morning-inbox',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
