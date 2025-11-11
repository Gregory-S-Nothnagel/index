// sw.js — handles offline caching and serving
const CACHE_NAME = 'music-cache-v2';
const CORE_ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// --- Handle requests ---
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) return resp;
      return fetch(event.request).then(networkResp => {
        // Cache songs automatically when fetched
        if (event.request.url.endsWith('.mp3') || event.request.destination === 'audio') {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// --- Handle manual "Download All" pre-cache ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_SONGS') {
    const songs = event.data.songs.map(s => s.url);
    caches.open(CACHE_NAME).then(cache => {
      Promise.all(songs.map(url => fetch(url).then(resp => cache.put(url, resp.clone()))))
        .then(() => {
          self.clients.matchAll().then(clients => {
            clients.forEach(client => client.postMessage({ type: 'CACHE_COMPLETE' }));
          });
        })
        .catch(err => console.error('Error caching songs:', err));
    });
  }
});
