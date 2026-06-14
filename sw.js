const CACHE_NAME = 'edital-inteligente-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './assets/logo.svg',
  './js/app.js',
  './js/db.js',
  './js/firebase-config.js',
  './js/gemini.js',
  './js/pdf-parser.js',
  // CDNs cached for offline availability
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Install Event - Caching all core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and CDNs');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Cleaning old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache First with Network Fallback
self.addEventListener('fetch', (e) => {
  // Do not intercept Firestore internal sync connections or external Gemini API calls
  if (
    e.request.url.includes('firestore.googleapis.com') ||
    e.request.url.includes('generativelanguage.googleapis.com') ||
    e.request.url.includes('firebase') && !e.request.url.includes('gstatic')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(e.request).then((networkResponse) => {
        // Only cache successful standard requests
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for offline if file not found in cache
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
