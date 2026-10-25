// Service Worker - Grupo Multiservicios Deportivo JL PWA
const CACHE_NAME = 'gmd-jl-cache-v2.1.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css?v=2.1.0',
  './manifest.webmanifest',
  './js/app.js?v=2.0.0',
  './js/store.js?v=2.0.0',
  './js/standings.js?v=2.0.0',
  './js/csv-importer.js?v=2.0.0',
  './js/supabase.js?v=2.0.0',
  './assets/logo.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/banner_baloncesto.jpg',
  './assets/banner_voleibol.jpg',
  './assets/banner_futsal.jpg',
  './templates/ROSTER_Y_EQUIPOS.csv',
  './templates/CONFIG_GRUPOS.csv',
  './templates/CALENDARIO_Y_RESULTADOS.csv'
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation & code, stale-while-revalidate for images & fonts
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore chrome-extension or non-HTTP requests
  if (!event.request.url.startsWith('http')) return;

  // For Supabase API or external calls, try network first then fallback to empty/cached
  if (requestUrl.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true, message: 'Offline mode active' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Network-first for HTML, styles and scripts
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    event.request.destination === 'style' ||
    event.request.destination === 'script'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for images, fonts, static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// Broadcast updates to clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
