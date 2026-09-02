import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { siteMetadata } from './build/site-metadata.ts';

const spriteProxy = {
  '/sprites': {
    target: 'https://raw.githubusercontent.com',
    changeOrigin: true,
    rewrite: (path: string) =>
      `/PokeAPI/sprites/master/sprites${path.replace(/^\/sprites/, '')}`,
  },
};

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
            urlPattern: ({ sameOrigin, url }) =>
              sameOrigin && url.pathname.startsWith('/sprites/pokemon/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'quizmon-pokemon-sprites-v2',
              cacheableResponse: { statuses: [200] },
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
  server: {
    proxy: spriteProxy,
  },
  preview: {
    proxy: spriteProxy,
  },
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
