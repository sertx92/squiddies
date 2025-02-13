// sw.js
const CACHE_NAME = 'ordinals-cache-v1';

// Pre-caching delle risorse statiche del sito
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/src/main.js',
  // Aggiungi qui eventuali altre risorse statiche
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Pre-caching delle risorse:", PRECACHE_URLS);
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// Intercetta le fetch per le risorse di ordinals.com/content
self.addEventListener('fetch', event => {
  if (event.request.url.includes('ordinals.com/content')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  }
});
