// src/registerServiceWorker.js
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration.scope);
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    });
  }
}
