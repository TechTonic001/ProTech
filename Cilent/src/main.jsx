// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { registerServiceWorker } from './registerServiceWorker';
import ErrorBoundary from './components/ErrorBoundary';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      cacheTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Pre-warm Neon before user interacts
;(async () => {
  try {
    const configured = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const apiUrl = configured
      ? configured.endsWith('/api')
        ? configured
        : `${configured}/api`
      : '';
    const healthPath = apiUrl ? `${apiUrl}/health` : '/api/health';
    await fetch(healthPath, { method: 'GET', cache: 'no-store' });
  } catch {
    // Best-effort warmup only
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

registerServiceWorker();
