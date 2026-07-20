// CMA Prep — Service Worker v15 (Batch 4.1 hotfix)
// Strategy: Network-first with cache fallback
// Auto-update: listens for SKIP_WAITING from the page → triggers instant reload
//
// v15 (Batch 4): version bump forces browsers to drop the v14 cache and
// register the new `push` and `notificationclick` handlers below. These
// handlers ship inert in Batch 4 — they wire up the plumbing so that when
// Batch 3-A adds server-scheduled push via Cloud Functions, notifications
// route through the SW and deep-link into the correct app screen without
// a further SW change. In the meantime, in-app engagement cards (client-
// side) and best-effort browser notifications (setTimeout while the app is
// open) handle daily nudges.
//
// v15 (Batch 4.1): SW file bytes change (default deep-link fix below),
// so browsers re-register this SW. CACHE_NAME stays 'cma-prep-v15' — the
// cache manifest (OFFLINE_URLS) did not change, so nothing to invalidate.
//
// v16 (Batch 4.5): OFFLINE_URLS now includes './app.js' — the main app
// script has been extracted from index.html into a separate file. Cache
// version MUST bump so the new manifest is picked up and app.js is
// pre-cached for offline use. If './app.js' isn't yet deployed when this
// SW installs, cache.add() will fail gracefully (per-URL try/catch below)
// and the network-first fetch handler will cache it on first request.

//
// v21 (S4 batch, items 1+3): questions/s4.json content changed (164 topics
// filled + 2 normalized) and it is precached in OFFLINE_URLS, so CACHE_NAME
// bumps v20->v21 to invalidate the stale copy. app.js/app.css are network-
// first, but the bump also gives the clean SKIP_WAITING auto-reload on deploy.
//
// v22 (S4 batch, item 2): app.js changed (quiz navigation refactor — index-keyed
// answers, Back/Skip, dot strip, finish flow across quiz-session + quiz-mode).
// app.js is a precached shell file, so CACHE_NAME bumps v21->v22 to refresh the
// precache and trigger the clean SKIP_WAITING auto-reload on deploy.
//
// v23 (S4 enrichment batch): lesson-s4.json gained 28 blocks (cost
// classifications in 4-1, rework/scrap 4-6, cost pool + POHR 4-9, flexible
// budget 4-14, least-squares 4-15) AND app.js got a one-line renderBlock fix
// (ex label now reads .l OR .title, restoring 31 titleless S4 examples).
// Both files are precached, so CACHE_NAME bumps v22->v23 to invalidate the
// stale copies and trigger the clean SKIP_WAITING auto-reload on deploy.
const CACHE_NAME = 'cma-prep-v23';
const OFFLINE_URLS = [
  './',
  './index.html',
  './app.js',
  './app.css',
  './cbq-data.js',
  './lessons/lesson-s1.json',
  './lessons/lesson-s2.json',
  './lessons/lesson-s3.json',
  './lessons/lesson-s4.json',
  './lessons/lesson-s5.json',
  './lessons/lesson-s6.json',
  // Batch 7 (B7-03): quiz + dictionary now pre-cached for full offline use.
  // Paths verified against the app's lazy loaders (fetch('./questions/s'+id+'.json'),
  // fetch('./dictionary/terms.json')). Cache version bumped v19->v20 to pick these up.
  './questions/s1.json',
  './questions/s2.json',
  './questions/s3.json',
  './questions/s4.json',
  './questions/s5.json',
  './questions/s6.json',
  './dictionary/terms.json'
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
      // Cache files individually so one missing file can't fail the whole install
      return Promise.all(
        OFFLINE_URLS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] skip cache:', url, err))
        )
      );
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

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 4 — PUSH NOTIFICATION HANDLERS
// ═══════════════════════════════════════════════════════════════════════════
// These handlers ship in v15 but are inert until Batch 3-A adds a Cloud
// Function that pushes payloads. Wiring them now means the future switch
// is a pure server-side change — no client refresh required.

self.addEventListener('push', event => {
  // Expected payload shape from future Cloud Function:
  //   { title, body, deepLink }  (deepLink one of: qod, wrong-answers, community, dashboard)
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    // Malformed payload — fall through to defaults
    data = { title: 'CMA Prep', body: 'Time for today\'s session' };
  }

  const title = data.title || 'CMA Prep';
  const options = {
    body: data.body || 'Time for today\'s session',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'cma-daily',        // one active daily notification at a time
    renotify: false,
    dir: 'auto',             // auto-detect RTL for Arabic content
    data: {
      // Batch 4.1: default lands on 'intro' — the app has no 'qod' tab.
      deepLink: data.deepLink || 'intro',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Batch 4.1: default lands on 'intro' — the app has no 'qod' tab.
  const deepLink = (event.notification.data && event.notification.data.deepLink) || 'intro';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Prefer focusing an existing tab and posting the deep-link intent to it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          try {
            client.postMessage({ type: 'DEEP_LINK', target: deepLink });
          } catch {}
          return;
        }
      }
      // No open tab → open a fresh one with the deep link as a hash fragment
      if (self.clients.openWindow) {
        return self.clients.openWindow('./#' + encodeURIComponent(deepLink));
      }
    })
  );
});
