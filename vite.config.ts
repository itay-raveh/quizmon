import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { contentPageEntries } from './build/content-pages.ts';
import { siteMetadata } from './build/site-metadata.ts';
import { pokemonCatalog } from './build/pokemon-catalog.ts';
import { SPRITE_SOURCE } from './src/domain/pokemon/sprite-source.ts';

const spriteProxy = {
  '/sprites': {
    target: SPRITE_SOURCE,
    changeOrigin: true,
  },
};
const proxy = {
  ...spriteProxy,
  '/api/auth': { target: 'http://127.0.0.1:8790' },
  '/api/account': { target: 'http://127.0.0.1:8790' },
  '/api/sync': { target: 'http://127.0.0.1:8790' },
  '/api/dev': { target: 'http://127.0.0.1:8790' },
  '/api/friends': { target: 'http://127.0.0.1:8790' },
  '/api/leaderboards': { target: 'http://127.0.0.1:8790' },
};
const uploadSentryMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_BROWSER_PROJECT &&
  process.env.GITHUB_SHA,
);

export default defineConfig({
  build: {
    assetsDir: 'assets/build',
    sourcemap: uploadSentryMaps ? 'hidden' : false,
    rolldownOptions: {
      input: ['index.html', ...contentPageEntries],
    },
  },
  optimizeDeps: { exclude: ['@powersync/web'] },
  plugins: [
    react(),
    siteMetadata(),
    pokemonCatalog(),
    VitePWA({
      filename: 'sw.ts',
      injectRegister: 'auto',
      injectManifest: {
        sourcemap: false,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: [
          '**/*.{js,css,html,woff2,json,webmanifest,wasm,bin}',
          'trainer-avatars/*.png',
        ],
      },
      manifest: false,
      registerType: 'prompt',
      srcDir: 'src',
      strategies: 'injectManifest',
    }),
    ...(uploadSentryMaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_BROWSER_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            errorHandler(error) {
              // The nested PWA build can swallow a failed upload hook.
              process.exitCode = 1;
              throw error;
            },
            release: { name: process.env.GITHUB_SHA },
            sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
            telemetry: false,
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy,
  },
  preview: {
    proxy,
  },
  test: {
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./tests/cloudflare-workers.ts', import.meta.url),
      ),
    },
    environment: 'node',
    maxWorkers: 4,
    testTimeout: 30_000,
    exclude: ['**/node_modules/**', 'tests/online/**'],
    globals: true,
  },
});
