import React from 'react';
import { hardRefreshApp, PRESERVED_AUTH_STORAGE_KEYS, PRESERVED_UI_STORAGE_KEYS } from '../lib/appUpdate';
import { PENDING_OPS_KEY } from '../lib/pending-writes';

// A Convex query that fails on the server throws from useQuery during render.
// With nothing to catch it React unmounts the whole tree and the student is
// left on a blank page. `silent` renders nothing in place of the failed part,
// for pieces the app can run without.
//
// The recovery screen follows GradeX's AppErrorBoundary: Reload, or clear the
// cached app and reload when a bad cache is what keeps breaking it.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info?.componentStack);
  }

  handleClearAndReload = async () => {
    try {
      // Drops the cached app, service worker and offline copy. Kept: who is
      // signed in (including Clerk's own keys), display preferences, and any
      // attendance not yet sent to the server.
      const clerkKeys = Object.keys(window.localStorage).filter((key) => /clerk/i.test(key));
      await hardRefreshApp({
        clearLocalStorage: true,
        preserveLocalStorageKeys: [
          ...PRESERVED_UI_STORAGE_KEYS,
          ...PRESERVED_AUTH_STORAGE_KEYS,
          ...clerkKeys,
          PENDING_OPS_KEY,
        ],
        clearSessionStorage: true,
        clearCacheStorage: true,
        clearServiceWorkers: true,
        requestServiceWorkerUpdate: true,
        clearIndexedDb: true,
      });
    } catch (err) {
      console.warn('[ErrorBoundary] Clear failed:', err);
      window.location.reload();
    }
  };

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.silent) return null;

    const buttonStyle = {
      padding: '10px 18px',
      borderRadius: '10px',
      border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '14px',
    };

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg-primary, #080808)', color: 'var(--text-primary, #f5f5f5)' }}>
        <div style={{ width: '100%', maxWidth: '420px', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color, rgba(255,255,255,0.2))', background: 'var(--card-bg, #111)', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.2rem' }}>Something went wrong</h2>
          <p style={{ margin: '0 0 18px', lineHeight: 1.6, color: 'var(--text-secondary, #888)', fontSize: '14px' }}>
            The page couldn't load. Try reloading, or clear the cache if it keeps happening. Your saved attendance is not affected.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{ ...buttonStyle, background: 'var(--text-primary, #f5f5f5)', color: 'var(--bg-primary, #080808)' }}
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleClearAndReload}
              style={{ ...buttonStyle, background: 'transparent', color: 'inherit' }}
            >
              Clear cache and reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
