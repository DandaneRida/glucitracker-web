// GluciTracker Service Worker - Offline Support
const CACHE_NAME = 'glucitracker-v2.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/data/ciqual-complete.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('⚠️ Service Worker: Erreur lors du caching initial', error);
        // Continue même si le caching échoue
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - Network first with cache fallback
self.addEventListener('fetch', event => {
  // Ignorer les requêtes Chrome
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ne pas cacher si ce n'est pas une réponse valide
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cloner la réponse pour la cacher
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Fallback au cache si offline
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }

            // Fallback pour les fichiers de données
            if (event.request.url.includes('/data/')) {
              return caches.match('/data/ciqual-complete.json');
            }

            // Fallback pour les pages
            return caches.match('/index.html');
          });
      })
  );
});

// Message event - Pour les notifications
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
