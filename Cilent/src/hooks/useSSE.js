import { useEffect, useRef } from 'react';

export const useSSE = (handlers = {}, enabled = true) => {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('protech_token');
    if (!token) return;

    const baseUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const apiBase = baseUrl && baseUrl.endsWith('/api') ? baseUrl : `${baseUrl || 'https://protechbackend.vercel.app'}/api`;
    const url = `${apiBase}/sse/connect?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);

    es.addEventListener('connected', () => {
      console.log('[SSE] Connected to real-time updates');
    });

    Object.entries(handlersRef.current).forEach(([eventName, handler]) => {
      es.addEventListener(eventName, (event) => {
        try {
          const data = JSON.parse(event.data);
          handler(data);
        } catch (err) {
          console.error('[SSE] Parse error:', err);
        }
      });
    });

    es.onerror = () => {
      console.warn('[SSE] Connection lost — will retry');
      es.close();
    };

    return () => {
      es.close();
    };
  }, [enabled]);
};
