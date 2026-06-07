// CMA Prep — Service Worker v8
// Strategy: Network-first with cache fallback
// Auto-update: listens for SKIP_WAITING from the page → triggers instant reload

const CACHE_NAME = 'cma-prep-v8';
const OFFLINE_URLS = [
  './',
  './index.html',
  './cbq.html',
  './s1.json',
  './s2.json',
  './s3.json',
  './s4.json',
  './s5.json',
  './s6.json'
];

// ── Page sends SKIP_WAITING after detecting a new SW is waiting ───────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    })
    // No skipWaiting() here — the page controls timing so reload is clean
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase.googleapis.com') ||
    url.includes('identitytoolkit.googleapis.com') ||
    url.includes('cloudinary.com') ||
    url.includes('googleapis.com') ||
    url.includes('script.google.com') ||
    url.includes('youtube.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          return caches.match('./');
        });
      })
  );
});
