const CACHE_NAME = 'file-cache';

// Files to cache when the service worker installs
const filesToCache = [
  './ARE_YOU_WASHED_IN_THE_BLOOD.mp4',
  './GOD_LEADS_HIS_DEAR_CHILDREN_ALONG.mp4',
  './GREAT_IS_THY_FAITHFULNESS.mp3',
  './IM_A_PILGRIM.mp3',
  './MY_SAVIOR_FIRST_OF_ALL.mp3',
  './NOTHING_BUT_THE_BLOOD_OF_JESUS.mp3',
  './IT_IS_WELL_WITH_MY_SOUL.mp3',
  './TRUST_AND_OBEY.mp3',
  './ROCK_OF_AGES.mp3',
  './LEANING_ON_THE_EVERLASTING_ARMS.mp3',
  './THE_SWEET_BY_AND_BY.mp3',
  './WHAT_A_FRIEND_WE_HAVE_IN_JESUS.mp3'
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

// Intercept network requests and look in cache
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Make sure the request URL is only looking at the path after the domain (relative URL)
  const relativeUrl = requestUrl.pathname;

  event.respondWith(
    caches.match(relativeUrl).then((cachedResponse) => {
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
