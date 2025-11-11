// sw.js — handles offline caching and serving
const CACHE_NAME = 'music-cache-v3';
const CORE_ASSETS = ['./', './index.html'];

// --- Install: cache the core app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// --- Activate: clear old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// --- Fetch handler ---
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) return resp;

      return fetch(event.request).then(networkResp => {
        // ✅ Only cache full 200 OK responses (avoid 206 partial content)
        if (
          networkResp.status === 200 &&
          (event.request.url.endsWith('.mp3') || event.request.destination === 'audio')
        ) {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// --- Manual "Download All" full-cache for offline playback ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_SONGS') {
    const songs = event.data.songs.map(s => s.url);

    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Download entire MP3 files (full 200 OK)
        for (const url of songs) {
          const response = await fetch(url, { headers: { Range: '' } }); // request full file
          if (response.ok && response.status === 200) {
            await cache.put(url, response.clone());
          } else {
            console.warn('Skipped caching', url, '(status:', response.status, ')');
          }
        }

        // Notify all clients (tabs) that caching is complete
        const clients = await self.clients.matchAll();
        clients.forEach(client => client.postMessage({ type: 'CACHE_COMPLETE' }));

      } catch (err) {
        console.error('Error caching songs:', err);
      }
    });
  }
});
