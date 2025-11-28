const CACHE_NAME = 'file-cache';

// Files to cache when the service worker installs
const filesToCache = [
  './index.html',
  './ARE_YOU_WASHED_IN_THE_BLOOD.mp3',
  './GOD_LEADS_HIS_DEAR_CHILDREN_ALONG.mp3',
  './GREAT_IS_THY_FAITHFULNESS.mp3',
  './IM_A_PILGRIM.mp3',
  './MY_SAVIOR_FIRST_OF_ALL.mp3',
  './NOTHING_BUT_THE_BLOOD_OF_JESUS.mp3',
  './IT_IS_WELL_WITH_MY_SOUL.mp3',
  './TRUST_AND_OBEY.mp3',
  './ROCK_OF_AGES.mp3',
  './LEANING_ON_THE_EVERLASTING_ARMS.mp3',
  './THE_SWEET_BY_AND_BY.mp3',
  './WHAT_A_FRIEND_WE_HAVE_IN_JESUS.mp3',
  './SWING_LOW_SWEET_CHARIOT.mp3',
  './JESUS_PAID_IT_ALL.mp3',
  './I_FEEL_LIKE_TRAVELING_ON.mp3',
  './FARTHER_ALONG.mp3', './THE_WAYFARING_PILGRIM.mp3',
  './ILL_HAVE_A_NEW_LIFE.mp3', './HIDE_ME,_ROCK_OF_AGES.mp3',
  './STAND_BY_ME_FATHER.mp3', './IM_A_PILGRIM_SAM_COOKE.mp3',
  './SWING_DOWN_SWEET_CHARIOT.mp3', './SO_HIGH.mp3',
  './JESUS_BE_A_FENCE_AROUND_ME.mp3', './LISTEN_TO_THE_ANGELS_SING.mp3'
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

  // --- NETWORK FIRST for index.html ---
  if (relativeUrl === '/index/hymns/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Save fresh version into cache
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(relativeUrl, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() =>
          // Fall back to cache if network fails
          caches.match(relativeUrl)
        )
    );
    return;
  }

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
