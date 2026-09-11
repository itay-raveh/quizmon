import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { contentPageEntries } from './build/content-pages.ts';
import { siteMetadata } from './build/site-metadata.ts';
import { SPRITE_SOURCE } from './src/domain/pokemon/sprite-source.ts';

const spriteProxy = {
  '/sprites': {
    target: SPRITE_SOURCE,
    changeOrigin: true,
  },
};

export default defineConfig({
  build: {
    assetsDir: 'assets/build',
    rolldownOptions: {
      input: ['index.html', ...contentPageEntries],
    },
  },
  plugins: [
    react(),
    siteMetadata(),
    VitePWA({
      filename: 'sw.ts',
      injectRegister: 'auto',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,woff2,json,webmanifest}'],
      },
      manifest: false,
      registerType: 'prompt',
      srcDir: 'src',
      strategies: 'injectManifest',
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
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./tests/cloudflare-workers.ts', import.meta.url),
      ),
    },
    environment: 'jsdom',
    exclude: ['e2e/**', 'node_modules/**'],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
