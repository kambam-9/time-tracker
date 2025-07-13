'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('SW registered: ', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show update notification
                  console.log('New content available, please refresh.');
                }
              });
            }
          });

          // Enable background sync if supported
          if ('sync' in window.ServiceWorkerRegistration.prototype) {
            console.log('Background sync supported');
          }

        } catch (error) {
          console.log('SW registration failed: ', error);
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_SUCCESS') {
          console.log(`Successfully synced ${event.data.data.synced} entries`);
          // Could show a toast notification here
        }
      });
    }
  }, []);

  return null;
}