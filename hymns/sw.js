const CACHE_NAME = 'file-cache';

// Files to cache when the service worker installs
const filesToCache = [
  './AMAZING_GRACE.mp3',
];

// Install service worker and cache necessary files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache everything in the directory except index.html
      return cache.addAll(filesToCache);
    })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercept network requests and cache any file (except index.html)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached response if available
      }

      // If the file is not in cache, return a failure response
      return new Response('Resource not found in cache', {
        status: 404, // You can use a different status code, e.g., 410 or 503
        statusText: 'Not Found'
      });
    })
  );
});
