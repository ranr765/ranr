/* Service worker for Simple Serve — its only job is web-push notifications
   (the morning inbox reminder). No offline caching, so the app always loads
   fresh from the network. */

self.addEventListener('install', (e) => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

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
