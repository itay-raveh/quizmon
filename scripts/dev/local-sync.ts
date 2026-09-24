import type { SyncConnection } from '../../src/domain/sync/connection.ts';

export const localSync: SyncConnection = {
  endpoint: 'http://127.0.0.1:8089',
  audience: 'quizmon',
};
