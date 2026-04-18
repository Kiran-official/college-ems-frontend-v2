'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          console.log('SW registered:', registration.scope);

          // Check for updates periodically (every 60 minutes)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);

          // Handle update found
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('New service worker activated');
                }
              });
            }
          });
        } catch (error) {
          console.error('SW registration failed:', error);
        }
      };

      // Use load event to ensure the page is fully loaded before registering
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
