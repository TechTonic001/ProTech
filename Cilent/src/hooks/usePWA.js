import { useState, useEffect } from 'react';
import api from '../utils/api';

export const usePWA = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    registerServiceWorker();
    checkSubscription();
  }, []);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[PWA] Service worker registered', registration);
    } catch (err) {
      console.error('[PWA] Service worker registration failed', err);
    }
  };

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('[PWA] Failed to check push subscription status', err);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  };

  const subscribeToPush = async () => {
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY
        )
      });

      await api.post('/pwa/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(
            ...new Uint8Array(subscription.getKey('p256dh'))
          )),
          auth: btoa(String.fromCharCode(
            ...new Uint8Array(subscription.getKey('auth'))
          ))
        },
        deviceInfo: navigator.userAgent
      });

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[PWA] Subscribe failed', err);
      return false;
    }
  };

  return { isSubscribed, permission, subscribeToPush };
};
