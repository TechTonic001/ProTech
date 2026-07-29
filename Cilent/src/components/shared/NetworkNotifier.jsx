import { useEffect, useRef, useState } from 'react';

const NetworkNotifier = () => {
  const [status, setStatus] = useState(() => {
    if (typeof navigator === 'undefined') return 'hidden';
    return navigator.onLine ? 'hidden' : 'offline';
  });
  const hideTimerRef = useRef(null);

  useEffect(() => {
    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const handleOffline = () => {
      clearHideTimer();
      setStatus('offline');
    };

    const handleOnline = () => {
      clearHideTimer();
      setStatus('online');
      hideTimerRef.current = setTimeout(() => {
        setStatus('hidden');
        hideTimerRef.current = null;
      }, 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearHideTimer();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (status === 'hidden') return null;

  const isOffline = status === 'offline';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-0 left-0 right-0 z-[9999] px-4 py-3 text-center text-sm font-bold text-white shadow-lg transition-colors duration-300 ${
        isOffline ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {isOffline
        ? '⚠️ No internet connection. Please check your network.'
        : '🟢 Internet connection restored!'}
    </div>
  );
};

export default NetworkNotifier;
