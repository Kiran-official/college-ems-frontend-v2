const CACHE_NAME = 'sicm-ems-v2'; // Version bump

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png'
];

// 1. Install - Pre-cache the App Shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// 2. Activate - Cleanup and Navigation Preload
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names.map((name) => {
            if (name !== CACHE_NAME) return caches.delete(name);
          })
        )
      ),
      // Enable Navigation Preload
      self.registration.navigationPreload ? self.registration.navigationPreload.enable() : Promise.resolve(),
      self.clients.claim()
    ])
  );
});

// 3. Fetch Strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation requests: Network-first, then cache, then offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Use preloaded response if available
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;

          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(event.request);
          return cachedResponse || caches.match('/offline.html');
        }
      })()
    );
    return;
  }

  // Static Assets: Stale-while-revalidate
  const isAsset = 
    event.request.destination === 'style' ||
    event.request.destination === 'script' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    url.pathname.startsWith('/_next/static/');

  if (isAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Cache-first fallback for everything else (not recommended for dynamic data)
  // We actually want to be careful here. For now, let's just let it hit the network.
});

// 4. Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/assets/icon-192x192.png',
      badge: '/assets/icon-192x192.png',
      requireInteraction: true, // Keep notification until user interacts
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('SICM EMS', {
        body: event.data.text(),
        icon: '/assets/icon-192x192.png',
      })
    );
  }
});

// 5. Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Improved matching with 'includes'
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
