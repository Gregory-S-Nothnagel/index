const CACHE_NAME = 'file-cache-v1';

// Files to cache when the service worker installs
const filesToCache = [
  '/index/hymns/ARE_YOU_WASHED_IN_THE_BLOOD.mkv',
  '/index/hymns/I\'M_A_PILGRIM.mp3',
  '/index/hymns/GOD_LEADS_HIS_DEAR_CHILDREN_ALONG.mkv',
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
  // Don't cache index.html, we only want to cache other files
  if (event.request.url.endsWith('/index.html')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return cached response if available
      }

      // If not in cache, fetch the file and cache it
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache the response for future use
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
