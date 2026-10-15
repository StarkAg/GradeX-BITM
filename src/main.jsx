import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { convex } from './lib/convex';
import './styles.css';
import './styles/liquid-glass.css';
import { initLiquidGlass } from './lib/liquidGlass.js';

// vite-plugin-pwa does not register a worker in development, but a worker
// registered by an earlier production-like local build can still control this
// origin and serve an obsolete bundle. Remove it before the dev app renders so
// local testing always exercises the source Vite is serving. (As in GradeX.)
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => caches.keys())
    .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
    .catch((error) => console.warn('[Dev] Could not clear an old service worker cache:', error));
}

initLiquidGlass();

const savedTheme = localStorage.getItem('gradex-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Sign-in tokens are kept in localStorage by ConvexAuthProvider, so a session
// survives closing the app, an offline start and an installed-app restart.
// `shouldHandleCode` is off: nothing here signs in through a ?code= link.
createRoot(document.getElementById('root')).render(
  <ConvexAuthProvider client={convex} shouldHandleCode={false}>
    <BrowserRouter>
      <ErrorBoundary name="app">
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </ConvexAuthProvider>
);
