import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Renders the real app in jsdom against a real Convex deployment.
//   E2E_CONVEX_URL=https://<dev-deployment>.convex.cloud npm run test:e2e
// It creates and deletes a throwaway account, so point it at the dev
// deployment, never production. Not part of `npm test`.
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_CONVEX_URL': JSON.stringify(process.env.E2E_CONVEX_URL || ''),
  },
  resolve: {
    alias: {
      // The service worker has no meaning in jsdom.
      'virtual:pwa-register/react': fileURLToPath(new URL('./tests-e2e/pwa-register-stub.js', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests-e2e/**/*.e2e.test.jsx'],
    testTimeout: 90000,
    css: false,
  },
})
