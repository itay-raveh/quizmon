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
    rolldownOptions: {
      input: ['index.html', 'privacy.html', 'terms.html'],
    },
  },
  plugins: [
    react(),
    siteMetadata(),
    VitePWA({
      filename: 'sw.ts',
      injectRegister: 'auto',
      injectManifest: {
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
