// GluciTracker Service Worker - Offline Support
const CACHE_NAME = 'glucitracker-v2.0';
const FALLBACK_URL = '/index.html';

const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/data/ciqual-complete.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - Cacher tous les fichiers critiques
self.addEventListener('install', event => {
  console.log('[SW] Installation du Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] ✅ Cache ouvert:', CACHE_NAME);
        
        // Ajouter les fichiers locaux d'abord (obligatoire pour offline)
        const localFiles = ['/', '/index.html', '/css/style.css', '/js/app.js', '/data/ciqual-complete.json'];
        return cache.addAll(localFiles)
          .then(() => {
            console.log('[SW] ✅ Fichiers locaux cachés');
            // Essayer de cacher les fichiers CDN en arrière-plan
            const cdnFiles = [
              'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
              'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
            ];
            return Promise.allSettled(cdnFiles.map(url => cache.add(url)))
              .then(() => console.log('[SW] ✅ Fichiers CDN cachés (partiellement)'));
          })
          .catch(error => {
            console.error('[SW] ⚠️ Erreur caching:', error);
          });
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  console.log('[SW] Activation du Service Worker...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  console.log('[SW] ✅ Service Worker actif et opérationnel');
});

// Fetch event - Stragégie: Network First, Cache Fallback, Offline Fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes de chrome-extension
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Vérifier que c'est une réponse valide
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Cloner la réponse pour la cacher
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseToCache);
          })
          .catch(err => console.log('[SW] Erreur caching:', err));

        return response;
      })
      .catch(() => {
        // Fallback au cache si offline
        return caches.match(request)
          .then(response => {
            if (response) {
              console.log('[SW] ✅ Offline - Réponse en cache:', request.url);
              return response;
            }

            // Fallback final pour les pages
            if (request.destination === 'document') {
              return caches.match(FALLBACK_URL)
                .then(fallback => fallback || new Response('Offline - Veuillez recharger',
                  { status: 503, statusText: 'Service Unavailable', headers: new Headers({'Content-Type': 'text/plain'}) }));
            }

            console.log('[SW] ⚠️ Offline - Pas en cache:', request.url);
            return new Response('Resource not cached', { status: 503 });
          });
      })
  );
});

// Message event - Pour les notifications et les updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker script chargé');

