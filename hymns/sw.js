const CACHE_NAME = 'music-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
];

// Install event — pre-cache basic assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate event — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch event — serve from cache, else network
self.addEventListener('fetch', event => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req);
    })
  );
});

// Listen for messages from index.html
self.addEventListener('message', async event => {
  if (event.data?.type === 'CACHE_SONGS') {
    const songs = event.data.songs;
    const client = await self.clients.get(event.source.id);
    if (!songs || !client) return;

    const cache = await caches.open(CACHE_NAME);
    let done = 0;
    const total = songs.length;

    for (const song of songs) {
      try {
        // Force full download — no partial fetches
        const response = await fetch(song.url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await cache.put(song.url, response.clone());
        done++;
        // Send progress update to page
        client.postMessage({ type: 'CACHE_PROGRESS', done, total });
      } catch (err) {
        console.error(`Failed to cache ${song.title}:`, err);
      }
    }

    // Notify when done
    client.postMessage({ type: 'CACHE_COMPLETE' });
  }
});
