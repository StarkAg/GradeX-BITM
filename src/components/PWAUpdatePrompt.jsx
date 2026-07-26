import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function PWAUpdatePrompt() {
  const location = useLocation();
  const intervalRef = useRef(null);
  const pendingUpdateRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service worker registered');
      if (!registration) return;

      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        if (!document.hidden && navigator.onLine) {
          registration.update();
        }
      }, UPDATE_CHECK_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration error:', error);
    },
  });

  useEffect(() => {
    if (!needRefresh) return;
    console.log('[PWA] New version available, will apply on next navigation');
    pendingUpdateRef.current = true;
  }, [needRefresh]);

  useEffect(() => {
    if (!pendingUpdateRef.current) return;

    console.log('[PWA] Applying update on navigation');
    pendingUpdateRef.current = false;
    updateServiceWorker(true);
  }, [location.pathname, updateServiceWorker]);

  useEffect(() => {
    const applyPendingUpdate = () => {
      if (document.visibilityState !== 'visible' || !pendingUpdateRef.current) return;

      console.log('[PWA] Applying update on tab focus');
      pendingUpdateRef.current = false;
      updateServiceWorker(true);
    };

    document.addEventListener('visibilitychange', applyPendingUpdate);
    return () => document.removeEventListener('visibilitychange', applyPendingUpdate);
  }, [updateServiceWorker]);

  useEffect(() => () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
  }, []);

  return null;
}
