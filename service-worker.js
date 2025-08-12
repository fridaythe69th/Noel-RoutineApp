const CACHE_NAME = "routine-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./styles.css",
  "./script.js"
];

// Install service worker and cache files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

// Serve cached files when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
