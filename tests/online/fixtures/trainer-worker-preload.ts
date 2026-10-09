import * as Sentry from '@sentry/node';
import { parentPort } from 'node:worker_threads';
import '../../../server/trainer-projection-worker.ts';

parentPort?.postMessage({
  type: 'preload-check',
  initialized: Boolean(Sentry.getClient()),
});
