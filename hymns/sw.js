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
  const req = event.request;

  // Handle range requests for audio/video
  if (req.headers.get('range')) {
    event.respondWith(handleRangeRequest(req));
    return;
  }

  event.respondWith(
    caches.match(req).then(resp => {
      if (resp) return resp;

      return fetch(req).then(networkResp => {
        if (
          networkResp.ok &&
          (req.destination === 'audio' || req.url.endsWith('.mp3') || req.url.endsWith('.mkv'))
        ) {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return networkResp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

// --- Handle range requests manually ---
async function handleRangeRequest(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req.url);

  if (!cached) {
    // not cached → fall back to network
    return fetch(req);
  }

  const blob = await cached.blob();
  const rangeHeader = req.headers.get('range');
  const size = blob.size;

  // Parse range header (e.g., "bytes=500-")
  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!match) {
    return new Response(blob, {
      status: 200,
      headers: { 'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg' },
    });
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : size - 1;
  const chunk = blob.slice(start, end + 1);

  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunk.size,
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
    },
  });
}
