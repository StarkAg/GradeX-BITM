import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Kept apart from vite.config.mjs: the app build registers the PWA plugin and
// emits version.json, neither of which a test run should do.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'edge-runtime',
    // *.test.jsx files opt into jsdom with an @vitest-environment comment.
    include: ['tests/**/*.test.{js,jsx,ts}'],
    server: { deps: { inline: ['convex-test'] } },
  },
})
