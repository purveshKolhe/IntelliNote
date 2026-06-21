const CACHE_NAME = 'intellinote-cache-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.webp',
  // Note: Vite will bundle all styles and code locally.
  // In development mode, files are requested dynamically,
  // while in production they are compiled into /assets/
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Exclude AI API endpoints so online checks/requests still hit the network directly
  if (event.request.url.includes('api.groq.com') || event.request.url.includes('api.openai.com')) {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isTrustedCDN = requestUrl.hostname === 'images.unsplash.com' || 
                       requestUrl.hostname === 'fonts.googleapis.com' || 
                       requestUrl.hostname === 'fonts.gstatic.com';

  // Handle local development asset requests and static files
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in the background to update the cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200 && (isSameOrigin || isTrustedCDN)) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Silent catch for when offline
        });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic assets if they are valid local requests (exclude dev socket/browser extensions)
        if (
          networkResponse.status === 200 &&
          (isSameOrigin || isTrustedCDN) &&
          !event.request.url.startsWith('chrome-extension:') &&
          !event.request.url.includes('/@vite/') &&
          !event.request.url.includes('ws://')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
