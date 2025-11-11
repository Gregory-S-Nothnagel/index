// sw.js — works safely on GitHub Pages
const CACHE_NAME = 'music-cache-v4';
const CORE_ASSETS = ['./', './index.html'];

// --- Install: cache the core app shell ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// --- Activate: clean up old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// --- Fetch handler: serve from cache, then network fallback ---
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => {
      if (resp) return resp;

      return fetch(event.request).then(networkResp => {
        // only cache successful full responses
        if (networkResp.ok && (event.request.destination === 'audio' || event.request.url.endsWith('.mp3') || event.request.url.endsWith('.mkv'))) {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// --- Handle manual "Download All" command ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CACHE_SONGS') {
    const songs = event.data.songs.map(s => s.url);

    caches.open(CACHE_NAME).then(async (cache) => {
      let completed = 0;

      for (const url of songs) {
        try {
          // ⚙️ Fetch without CORS enforcement
          const response = await fetch(url, { mode: 'no-cors' });

          // opaque responses can still be cached!
          if (response && (response.ok || response.type === 'opaque')) {
            await cache.put(url, response.clone());
            completed++;
          } else {
            console.warn('Skipped caching', url, '(status:', response.status, ')');
          }
        } catch (err) {
          console.warn('Failed to cache', url, err);
        }
      }

      console.log(`✅ Cached ${completed}/${songs.length} songs`);

      // notify page when done
      const clients = await self.clients.matchAll();
      clients.forEach(client =>
        client.postMessage({ type: 'CACHE_COMPLETE', count: completed })
      );
    });
  }
});
