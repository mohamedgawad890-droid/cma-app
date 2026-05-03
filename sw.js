// CMA Prep — Service Worker v3
// Strategy: Network-first with cache fallback

const CACHE_NAME = 'cma-prep-v3';
const OFFLINE_URLS = [
  './',
  './index.html',
  './cbq.html',
  './questions/s1.json',
  './questions/s2.json',
  './questions/s3.json',
  './questions/s4.json',
  './questions/s5.json',
  './questions/s6.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_URLS);
    }).then(() => self.skipWaiting())
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
