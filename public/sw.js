// AWIS — Algerian Wildfire Intelligence System Service Worker
// Designed for remote forest operations with zero or degraded internet connectivity

const CACHE_NAME = 'awis-wildfire-offline-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/fire-alert.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[AWIS ServiceWorker] Pre-caching offline application shell');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[AWIS ServiceWorker] Pre-cache partial fail, continuing dynamic cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[AWIS ServiceWorker] Clearing legacy cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Handle Navigation (HTML page loads) - Network First with Cache Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          console.log('[AWIS ServiceWorker] Offline detected, serving cached shell');
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const fallbackIndex = await caches.match('/index.html');
          return fallbackIndex || new Response('Offline: AWIS Cached Shell available.', {
            headers: { 'Content-Type': 'text/html' }
          });
        })
    );
    return;
  }

  // Handle Static Assets (Scripts, CSS, Fonts, Images) - Cache First with Network Fallback
  if (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached and fetch in background to refresh
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default Stale-While-Revalidate for other resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// ============================================================================
// AWIS TACTICAL PUSH NOTIFICATIONS & BACKGROUND HIGH-PRIORITY WILDFIRE ALERTS
// ============================================================================

// 1. Listen for background Web Push events
self.addEventListener('push', (event) => {
  console.log('[AWIS ServiceWorker] High-priority Push event received');

  let alertData = {};
  if (event.data) {
    try {
      alertData = event.data.json();
    } catch (e) {
      alertData = {
        title: '🔥 إنذار أحمر: حريق غابات عالي الخطورة',
        body: event.data.text() || 'بؤرة نارية متسارعة تهدد الكتلة الغابية.'
      };
    }
  }

  const title = alertData.title || '🚨 إنذار أحمر عالي الخطورة (AWIS Red Alert)';
  const incidentId = alertData.incidentId || alertData.id || `DZ-WF-${Date.now()}`;
  const wilaya = alertData.wilaya || 'قطاع عملياتي نشط';
  const riskLevel = alertData.riskLevel || 'critical';

  const notificationOptions = {
    body: alertData.body || `📍 ${wilaya}: استجابة طارئة مطلوبة فورا. سرعة الانتشار تهدد الأصول الحيوية.`,
    icon: alertData.icon || '/fire-alert.svg',
    badge: alertData.badge || '/fire-alert.svg',
    tag: alertData.tag || `fire-alert-${incidentId}`,
    renotify: true,
    requireInteraction: true, // Remains on screen until user interacts
    vibrate: [300, 150, 300, 150, 450, 200, 600], // Distinctive emergency siren vibration
    timestamp: alertData.timestamp || Date.now(),
    data: {
      incidentId: incidentId,
      coordinates: alertData.coordinates,
      wilaya: wilaya,
      riskLevel: riskLevel,
      url: alertData.url || `/?incidentId=${incidentId}`
    },
    actions: [
      {
        action: 'view_incident',
        title: '📍 فتح مركز القيادة (Open GIS)'
      },
      {
        action: 'call_14',
        title: '📞 طوارئ 14 (Civil Protection)'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

// 2. Listen for direct client messages (e.g. background watcher or manual test simulation)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_FIRE_ALERT') {
    const { title, options } = event.data;
    const finalOptions = {
      ...options,
      icon: options.icon || '/fire-alert.svg',
      badge: options.badge || '/fire-alert.svg',
      vibrate: options.vibrate || [300, 150, 300, 150, 450, 200, 600],
      requireInteraction: true,
      renotify: true,
      actions: options.actions || [
        {
          action: 'view_incident',
          title: '📍 فتح مركز القيادة (Open GIS)'
        },
        {
          action: 'call_14',
          title: '📞 طوارئ 14 (Civil Protection)'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title, finalOptions)
    );
  } else if (event.data.type === 'SCHEDULE_BACKGROUND_ALERT') {
    // Allows user to switch tabs or minimize window before notification fires
    const { delayMs, title, options } = event.data;
    const delay = typeof delayMs === 'number' ? delayMs : 4000;

    setTimeout(() => {
      self.registration.showNotification(title, {
        ...options,
        icon: options.icon || '/fire-alert.svg',
        badge: options.badge || '/fire-alert.svg',
        vibrate: options.vibrate || [300, 150, 300, 150, 450, 200, 600],
        requireInteraction: true,
        renotify: true,
        actions: options.actions || [
          {
            action: 'view_incident',
            title: '📍 فتح مركز القيادة (Open GIS)'
          },
          {
            action: 'call_14',
            title: '📞 طوارئ 14 (Civil Protection)'
          }
        ]
      });
    }, delay);
  }
});

// 3. User clicks on notification
self.addEventListener('notificationclick', (event) => {
  console.log('[AWIS ServiceWorker] Notification clicked:', event.notification.tag, 'Action:', event.action);
  event.notification.close();

  const incidentData = event.notification.data || {};
  const targetIncidentId = incidentData.incidentId;
  const targetCoords = incidentData.coordinates;

  // Handle emergency dialer action
  if (event.action === 'call_14') {
    if (self.clients && self.clients.openWindow) {
      event.waitUntil(self.clients.openWindow('tel:14'));
    }
    return;
  }

  // Handle opening or focusing window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and notify client to select incident
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'SELECT_INCIDENT_FROM_NOTIFICATION',
            incidentId: targetIncidentId,
            coordinates: targetCoords
          });
          return client.focus();
        }
      }

      // If no window is open, open one with incident query parameter
      if (self.clients.openWindow) {
        const urlToOpen = targetIncidentId ? `/?incidentId=${encodeURIComponent(targetIncidentId)}` : '/';
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// 4. Notification closed
self.addEventListener('notificationclose', (event) => {
  console.log('[AWIS ServiceWorker] Notification dismissed:', event.notification.tag);
});

