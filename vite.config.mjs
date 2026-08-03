import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const appVersion = packageJson.version
const appVersionTag = `v${appVersion.replace(/[^a-zA-Z0-9]/g, '')}`
const appVersionLabel = `v${appVersion}`
const buildDate = new Date().toISOString()
const versionPayload = {
  version: appVersion,
  appVersion: appVersionLabel,
  buildDate,
  buildTag: appVersionTag,
}
const manifestPayload = {
  name: 'GradeX - BITM',
  short_name: 'GradeX',
  description: 'Academic Tracker for BIT Mesra, Lalpur Campus',
  version: appVersion,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#0a0a0a',
  theme_color: '#000000',
  orientation: 'portrait-primary',
  categories: ['education', 'productivity'],
  lang: 'en',
  icons: [
    {
      src: '/arc-reactor.png',
      sizes: '32x32',
      type: 'image/png',
    },
    {
      src: '/arc-reactor1.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/arc-reactor1.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
}

const emitVersionJson = () => ({
  name: 'emit-version-json',
  configureServer(server) {
    server.middlewares.use('/version.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(versionPayload, null, 2))
    })
    server.middlewares.use('/manifest.webmanifest', (_req, res) => {
      res.setHeader('Content-Type', 'application/manifest+json')
      res.end(JSON.stringify(manifestPayload, null, 2))
    })
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify(versionPayload, null, 2),
    })
  },
})

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersionLabel),
    __APP_BUILD_DATE__: JSON.stringify(buildDate),
  },
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${appVersionTag}.js`,
        chunkFileNames: `assets/[name]-[hash]-${appVersionTag}.js`,
        assetFileNames: `assets/[name]-[hash]-${appVersionTag}.[ext]`,
      },
    },
  },
  plugins: [
    react(),
    emitVersionJson(),
    VitePWA({
      injectRegister: false,
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: ['arc-reactor.png', 'arc-reactor1.png', 'arc-favicon.svg'],
      manifest: manifestPayload,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,otf,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Clerk ships its SDK from its own CDN at runtime. Without this the
          // script is unavailable on an offline cold start, auth never
          // finishes loading, and the app hangs on the "Loading..." spinner
          // forever. StaleWhileRevalidate so it still refreshes when online.
          // (GradeX needs no equivalent - it doesn't use Clerk.)
          {
            urlPattern: /^https:\/\/.*\.clerk\.accounts\.dev\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'clerk-sdk',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/img\.clerk\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'clerk-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|otf|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/version\.json$/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
    host: true, // Allow access from network (for phone testing)
    // Proxy API requests to local Express server during development
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
