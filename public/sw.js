/**
 * AWIS — Algeria Wildfire Intelligence System Service Worker
 * Version: awis-tactical-cache-v2
 * Strategy: Cache-First for static assets, Stale-While-Revalidate for app shell & offline navigation.
 * Enables zero-connectivity field operations on tablets and smartphones in remote Algerian forests.
 */

const CACHE_NAME = 'awis-tactical-cache-v2';

// Pre-cached App Shell Assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/fire-alert.svg'
];

// Install Event: Pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[AWIS SW] Pre-caching tactical app shell assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[AWIS SW] Pre-cache partial fail (non-blocking):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Purge old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[AWIS SW] Removing stale cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Cache-First / Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Bypass Vite HMR, WebSockets, and external Google Firebase/Firestore APIs
  // (Firebase SDK handles its own offline persistence via IndexedDB)
  if (
    url.protocol === 'ws:' ||
    url.protocol === 'wss:' ||
    url.pathname.includes('@vite') ||
    url.pathname.includes('/@fs/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('apis.google.com')
  ) {
    return;
  }

  // 3. Navigation Requests (HTML / App Shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put('/index.html', responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback to pre-cached app shell
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || caches.match('/');
          });
        })
    );
    return;
  }

  // 4. Static Assets: JS, CSS, Fonts, Images, SVGs (Cache-First / Stale-While-Revalidate)
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Fetch from network to update cache in background (Stale-While-Revalidate)
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// Push Notifications for Tactical Wildfire Alerts
self.addEventListener('push', (event) => {
  let alertData = {
    title: 'AWIS Fire Alert',
    body: 'High-risk wildfire condition reported',
    icon: '/fire-alert.svg'
  };

  if (event.data) {
    try {
      alertData = { ...alertData, ...event.data.json() };
    } catch (e) {
      alertData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(alertData.title, {
      body: alertData.body,
      icon: alertData.icon || '/fire-alert.svg',
      badge: '/fire-alert.svg',
      tag: 'awis-fire-alert',
      renotify: true
    })
  );
});
