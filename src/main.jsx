import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { convex } from './lib/convex';
import './styles.css';

const clerkPublishableKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY in your env.');
}

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

const savedTheme = localStorage.getItem('gradex-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={clerkPublishableKey} afterSignOutUrl="/">
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <BrowserRouter>
        <ErrorBoundary name="app">
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </ConvexProviderWithClerk>
  </ClerkProvider>
);
