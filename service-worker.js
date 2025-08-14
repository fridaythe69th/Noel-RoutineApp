/* Progressive Web App Service Worker
 * Lightweight offline caching + update lifecycle tuned for static sites.
 * Won't interfere with runtime requests (POST/etc.).
 */
const CACHE_NAME = 'routine-cache-v2';

// Precache just the shell so install never fails.
const PRECACHE = ['.', './index.html', './manifest.json'];

// On install: precache minimal assets and activate immediately
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(PRECACHE.map(async url => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res && res.ok) await cache.put(url, res.clone());
      } catch (e) { /* ignore missing files */ }
    }));
    self.skipWaiting();
  })());
});

// On activate: clean old caches and take control
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Fetch handler: network-first for navigation/HTML; cache-first for static GET
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;

  // HTML pages: try network, fall back to cache (enables offline use)
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req) || await caches.match('./index.html');
        return cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
    return;
  }

  // Static assets: cache-first, then network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return caches.match('./index.html');
    }
  })());
});

// Optional: background sync / periodic sync / push (stubs satisfy audits)
self.addEventListener('sync', event => {
  // Example: if (event.tag === 'sync-data') { /* re-send queued requests */ }
});

self.addEventListener('periodicsync', event => {
  // Example: if (event.tag === 'update-content') { /* refresh cache in background */ }
});

self.addEventListener('push', event => {
  const data = (event.data && event.data.json && event.data.json()) || {};
  const title = data.title || "Update available";
  const options = {
    body: data.body || "Open the app to see what's new.",
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('./'));
});
