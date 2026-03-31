const CACHE_NAME = 'sicm-ems-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension or other non-http schemes
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);
  
  // Ignore Next.js hot module replacement and internal resources to prevent intercepting dev server streams
  if (url.pathname.startsWith('/_next/') || url.pathname.includes('webpack-hmr')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(async (error) => {
        // Handle React/Next.js aborted navigation fetches gracefully instead of throwing timeouts
        if (error.name === 'AbortError') {
          return new Response(null, { status: 499, statusText: 'Client Closed Request' });
        }

        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }

        // Check if the user is explicitly requesting an HTML page
        const isHTMLRequest = event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html');

        // If it's an HTML navigation request and we're offline, show the offline page
        if (isHTMLRequest) {
          return cache.match(OFFLINE_URL);
        }

        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Service Worker] Push Data:', data);

      const options = {
        body: data.body,
        icon: '/assets/icon-192x192.png',
        badge: '/assets/icon-192x192.png',
        data: {
          url: data.url || '/'
        }
      };

      event.waitUntil(
        self.registration.showNotification(data.title, options)
          .then(() => console.log('[Service Worker] Notification Shown.'))
          .catch(err => console.error('[Service Worker] Failed to show notification:', err))
      );
    } catch (e) {
      console.error('[Service Worker] Push event data was not JSON:', e);
      // Optional: show a fallback notification if data isn't JSON
      event.waitUntil(
        self.registration.showNotification('SICM EMS', {
          body: event.data.text(),
          icon: '/assets/icon-192x192.png',
        })
      );
    }
  } else {
    console.warn('[Service Worker] Push event received but no data found.');
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
