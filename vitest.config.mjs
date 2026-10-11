import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.mjs: the app build registers the PWA plugin and
// emits version.json, neither of which a test run should do.
export default defineConfig({
  test: {
    environment: 'edge-runtime',
    include: ['tests/**/*.test.{js,ts}'],
    server: { deps: { inline: ['convex-test'] } },
  },
})
