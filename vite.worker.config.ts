import { cloudflare } from '@cloudflare/vite-plugin';
import { sentryCloudflareVitePlugin } from '@sentry/cloudflare/vite';
import { defineConfig } from 'vite';

const configPath =
  process.env.QUIZMON_WRANGLER_CONFIG ?? 'deploy/wrangler.json';

export default defineConfig({
  root: 'worker',
  build: {
    outDir: '../.wrangler/vite-worker',
    emptyOutDir: true,
    sourcemap: 'hidden',
  },
  plugins: [
    cloudflare({
      configPath: `../${configPath}`,
      viteEnvironment: { name: 'worker' },
    }),
    sentryCloudflareVitePlugin({
      wranglerConfigPath: `../${configPath}`,
      autoInstrumentation: false,
    }),
  ],
});
