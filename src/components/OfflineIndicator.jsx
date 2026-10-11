import React, { useState, useEffect, useRef } from 'react';
import { PENDING_OPS_EVENT, SYNC_FEEDBACK_EVENT, countPendingOps } from '../lib/pending-writes';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pendingCount, setPendingCount] = useState(() => countPendingOps());
  const [customMessage, setCustomMessage] = useState('');
  const [customTone, setCustomTone] = useState('');
  const hideTimerRef = useRef(null);

  // "Syncing" is the real thing: it shows for as long as this device is still
  // holding writes made offline (see lib/pending-writes.js), not for a fixed
  // few seconds.
  const syncing = isOnline && pendingCount > 0;

  useEffect(() => {
    const hideAfter = (ms) => {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setShowBanner(false), ms);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      setCustomMessage('');
      setCustomTone('');
      setShowBanner(true);
      if (countPendingOps() === 0) hideAfter(2500);
    };

    const handleOffline = () => {
      window.clearTimeout(hideTimerRef.current);
      setIsOnline(false);
      setDismissed(false);
      setCustomMessage('');
      setCustomTone('');
      setShowBanner(true);
    };

    const handlePendingOps = () => {
      const count = countPendingOps();
      setPendingCount(count);
      // The queue just emptied while the "syncing" banner was up.
      if (count === 0 && navigator.onLine) hideAfter(2000);
    };

    // As in GradeX: any part of the app can put a message on the banner.
    const handleSyncFeedback = (event) => {
      const message = event?.detail?.message;
      if (!message) return;
      window.clearTimeout(hideTimerRef.current);
      setDismissed(false);
      setShowBanner(true);
      setCustomMessage(message);
      setCustomTone(event?.detail?.tone || 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(PENDING_OPS_EVENT, handlePendingOps);
    window.addEventListener(SYNC_FEEDBACK_EVENT, handleSyncFeedback);

    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.clearTimeout(hideTimerRef.current);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(PENDING_OPS_EVENT, handlePendingOps);
      window.removeEventListener(SYNC_FEEDBACK_EVENT, handleSyncFeedback);
    };
  }, []);

  if (!showBanner || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0)',
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '10px 16px',
        background: customTone === 'error'
          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
          : (isOnline && !customMessage)
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        animation: 'slideDown 0.3s ease-out',
        fontSize: '13px',
        fontWeight: 500
      }}
    >
      {customMessage ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{customMessage}</span>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: 'rgba(255,255,255,0.25)', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 8px', marginLeft: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            OK
          </button>
        </>
      ) : isOnline ? (
        syncing ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Online — syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Back online — synced</span>
          </>
        )
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <span>
            {pendingCount > 0
              ? `Offline — ${pendingCount} change${pendingCount !== 1 ? 's' : ''} will sync when you're back online`
              : 'Offline — showing cached data'}
          </span>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: 'white',
              borderRadius: '4px',
              padding: '2px 8px',
              marginLeft: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            OK
          </button>
        </>
      )}
    </div>
  );
}
