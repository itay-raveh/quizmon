const rows = vi.hoisted(() => new Map<string, unknown[]>());
vi.mock('./player-storage', () => ({
  canRecoverGuestSave: () => false,
  recoveryDatabase: () => ({
    readTransaction: (
      read: (tx: {
        getAll: (sql: string) => Promise<unknown[]>;
      }) => Promise<unknown>,
    ) =>
      read({ getAll: (sql) => Promise.resolve(rows.get(sql.slice(14)) ?? []) }),
  }),
}));

import { createRecoveryExport } from './save-recovery';

it('exports damaged account state with synced rounds and pending sequences', async () => {
  vi.stubGlobal('window', { sessionStorage: { getItem: () => null } });
  const damaged = { id: 'player', payload: '{broken' };
  const downloaded = { id: 'other-device-round', data: '{...}' };
  const pending = { id: 'pending', payload: '{}', sequence: 42 };
  rows.set('local_state', [damaged]);
  rows.set('round', [downloaded]);
  rows.set('pending_actions', [pending]);

  const recovery = await createRecoveryExport();
  expect(recovery.database).toMatchObject({
    local_state: [damaged],
    round: [downloaded],
    pending_actions: [pending],
  });
  expect(Object.keys(recovery.database)).toContain('player');
  vi.unstubAllGlobals();
});
