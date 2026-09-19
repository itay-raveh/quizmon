import type { SyncConnection } from '../../src/domain/sync/connection.ts';

export const localSync: SyncConnection = {
  version: 1,
  endpoint: 'http://127.0.0.1:8089',
  audience: 'quizmon-pilot',
};
