import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { siteMetadata } from './build/site-metadata.ts';

export default defineConfig({
  build: {
    assetsDir: 'assets/build',
  },
  plugins: [
    react(),
    siteMetadata(),
    VitePWA({
      injectRegister: 'script',
      manifest: false,
      registerType: 'prompt',
      workbox: {
        cleanupOutdatedCaches: true,
        globIgnores: ['assets/images/**'],
        globPatterns: [
          '**/*.{js,css,html,ico,png,webp,avif,woff2,mp3,json,webmanifest}',
        ],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern:
              /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'quizmon-pokemon-sprites',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 90,
                maxEntries: 400,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
