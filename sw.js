// CMA Prep — Service Worker v8
// ────────────────────────────────────────────────────────────────
// Strategy by content type:
//   • App shell HTML (/, index.html, cbq.html) → NETWORK-FIRST
//       Always try the network so app updates land immediately;
//       fall back to cache only when offline.
//   • CSS / JS / JSON / images                 → STALE-WHILE-REVALIDATE
//       Serve instantly from cache (fast!), then quietly refresh the
//       cache in the background for next time. This is the big speed win
//       for your question/lesson JSON on slow mobile connections.
//   • Firebase / Cloudinary / external          → never intercepted
//       (always go straight to the live network).
//
// ⚠️ When you push NEW questions/lessons or change app.css / cbq-data.js
//    and want every user to get it on their NEXT visit (not the one after),
//    bump the version number below: 'cma-prep-v8' → 'cma-prep-v9', etc.
// ────────────────────────────────────────────────────────────────

const CACHE_NAME = 'cma-prep-v8';

const PRECACHE_URLS = [
  './',
  './index.html',
  './cbq.html',
  './app.css',
  './cbq-data.js',
  './instructor.webp',
  // Quiz question files
  './questions/s1.json',
  './questions/s2.json',
  './questions/s3.json',
  './questions/s4.json',
  './questions/s5.json',
  './questions/s6.json',
  // Lesson content files
  './lessons/lesson-s1.json',
  './lessons/lesson-s2.json',
  './lessons/lesson-s3.json',
  './lessons/lesson-s4.json',
  './lessons/lesson-s5.json',
  './lessons/lesson-s6.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Fault-tolerant precache: if one file is missing/renamed, the install
      // still succeeds (the old cache.addAll would fail the WHOLE install on a
      // single 404). Anything that fails here just gets cached later on demand.
      Promise.allSettled(PRECACHE_URLS.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isExternal(url) {
  return url.includes('firestore.googleapis.com')
      || url.includes('firebase.googleapis.com')
      || url.includes('identitytoolkit.googleapis.com')
      || url.includes('cloudinary.com')
      || url.includes('googleapis.com')
      || url.includes('script.google.com')
      || url.includes('youtube.com');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  if (isExternal(url)) return; // let live services hit the network directly

  const path = new URL(url).pathname;
  const isHTML = event.request.mode === 'navigate'
              || path.endsWith('/')
              || path.endsWith('/index.html')
              || path.endsWith('/cbq.html');

  // ── App shell: network-first ──────────────────────────────────
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then(cached => cached || caches.match('./'))
        )
    );
    return;
  }

  // ── Everything else: stale-while-revalidate ───────────────────
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cached); // offline → use whatever we already had
        // Return the cached copy instantly if we have it; otherwise wait on network.
        return cached || networkFetch;
      })
    )
  );
});
