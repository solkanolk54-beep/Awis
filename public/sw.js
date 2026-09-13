// AWIS — Algerian Wildfire Intelligence System Service Worker
// Automatically purges stale pre-bundled Vite caches to ensure singleton React dispatcher integrity

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          console.log('[AWIS SW] Purging cache:', name);
          return caches.delete(name);
        })
      );
    })
    .then(() => self.registration.unregister())
    .then(() => self.clients.claim())
  );
});

// Pass-through: Do not intercept fetches to prevent duplicate React module resolutions in Vite
self.addEventListener('fetch', () => {
  // Let browser fetch directly from network/Vite dev server
  return;
});

// Tactical push notification handler for high-priority wildfire alerts
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
