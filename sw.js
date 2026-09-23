// CMA Prep — Service Worker
// Version history lives in CHANGELOG.md (moved out in Batch 23 — browsers
// byte-compare this file on every update check, so it is kept small).
//
// RULE: any deploy that changes a precached file (app, css, lesson/question
// JSON, dictionary) MUST bump CACHE_NAME. Static assets are served
// stale-while-revalidate from the versioned cache; the bump is what makes
// every student pick up the new files on the next open.

const CACHE_NAME = 'cma-prep-v51';

// EMERGENCY (v51): vendor/ returned 404 on Pages — Firebase is temporarily
// loaded from gstatic in index.html. Once vendor/firebase-9.23.0/ is deployed,
// restore the 3 './vendor/firebase-9.23.0/...' paths here and in index.html.
const VENDOR_URLS = [];

const OFFLINE_URLS = [
  './',
  './index.html',
  './dist/app.min.js',
  './dist/app.min.css',
  './dist/cbq-data.min.js',
  ...VENDOR_URLS,
  './lessons/lesson-s1.json',
  './lessons/lesson-s2.json',
  './lessons/lesson-s3.json',
  './lessons/lesson-s4.json',
  './lessons/lesson-s5.json',
  './lessons/lesson-s6.json',
  './questions/s1.json',
  './questions/s2.json',
  './questions/s3.json',
  './questions/s4.json',
  './questions/s5.json',
  './questions/s6.json',
  './dictionary/terms.json'
];

// Hosts the SW never touches (auth, database, uploads, webhooks, video).
const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'googleapis.com',
  'cloudinary.com',
  'script.google.com',
  'youtube.com'
];

// Same-origin paths served stale-while-revalidate (versioned by CACHE_NAME).
const STATIC_PATH_RX = /\/(dist|lessons|questions|dictionary|vendor)\/|\.(png|webp|jpg|jpeg|svg|ico)$/i;

// ── Page sends SKIP_WAITING after detecting a new SW is waiting ───────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Per-URL so one missing file can't fail the whole install.
      // cache:'reload' bypasses the HTTP cache — a new cache version must
      // never be seeded with a stale copy (GitHub Pages sends max-age=600).
      Promise.all(
        OFFLINE_URLS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(err => console.warn('[SW] skip cache:', url, err))
        )
      )
    )
    // No skipWaiting() here — the page controls timing so reload is clean
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (BYPASS_HOSTS.some(h => url.hostname === h || url.hostname.endsWith('.' + h))) return;

  // 1) Page navigations: network-first, fall back to the cached app shell.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, true));
    return;
  }

  // 2) Versioned same-origin static assets: stale-while-revalidate.
  if (url.origin === self.location.origin && STATIC_PATH_RX.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  // 3) Everything else: network-first, cached copy if offline, no HTML fallback.
  event.respondWith(networkFirst(req, false));
});

function networkFirst(req, isNavigation) {
  return fetch(req)
    .then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return res;
    })
    .catch(() =>
      caches.match(req, { ignoreSearch: isNavigation }).then(cached => {
        if (cached) return cached;
        if (!isNavigation) return Response.error();
        return caches.match('./index.html').then(r => r || caches.match('./'));
      })
    );
}

function staleWhileRevalidate(event) {
  const req = event.request;
  return caches.open(CACHE_NAME).then(cache =>
    cache.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);   // refresh in the background
        return cached;
      }
      return network.then(res => res || Response.error());
    })
  );
}

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
