import { DatabaseSync } from 'node:sqlite';
import { completion } from '../../../tests/online/progress-fixtures';
import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';
import { archiveCompletion } from '../../domain/sync/round-facts';
import type { LocalTransaction } from '../../lib/storage/local-database';
import type { LocalPlayerState } from '../../lib/storage/player-storage';
import { restoreBackup, type PlayerBackup } from './backup';

const transactPlayer = vi.hoisted(() => vi.fn());
vi.mock('../../lib/storage/player-storage', async (importOriginal) => ({
  ...(await importOriginal()),
  transactPlayer,
}));

it('restores pending edits before rounds and skips downloaded rounds', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE local_state (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE local_actions (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE local_completions (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE pending_actions (id TEXT PRIMARY KEY, payload TEXT, sequence INTEGER);
  `);
  const tx = {
    getAll: (sql: string, params: unknown[] = []) =>
      Promise.resolve(db.prepare(sql).all(...(params as string[]))),
    execute: (sql: string, params: unknown[] = []) =>
      Promise.resolve(db.prepare(sql).run(...(params as string[]))),
  } as unknown as LocalTransaction;
  const datasetId = crypto.randomUUID();
  const state: LocalPlayerState = {
    version: 2,
    datasetId,
    save: {
      version: SAVE_SCHEMA_VERSION,
      restoreId: null,
      data: emptyPlayerData(),
    },
    account: { id: 'trainer', serverEpoch: crypto.randomUUID() },
  };
  transactPlayer.mockImplementation(
    (
      run: (state: LocalPlayerState, tx: LocalTransaction) => Promise<unknown>,
    ) => run(state, tx),
  );
  const round = archiveCompletion(completion(datasetId));
  const synced = archiveCompletion(completion(datasetId));
  const { credited: _credited, ...upload } = round;
  void _credited;
  const editId = crypto.randomUUID();
  const edit = {
    id: editId,
    datasetId,
    kind: 'edit',
    payload: { id: editId, unit: 'specialty', value: 'ability' },
  };
  const action = { id: round.id, datasetId, kind: 'round', payload: upload };
  const editRow = { id: editId, payload: JSON.stringify(edit) };
  const roundRow = { id: round.id, payload: JSON.stringify(action) };
  const backup: PlayerBackup = {
    format: 'quizmon-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    state,
    records: {
      local_actions: [editRow, roundRow],
      local_completions: [
        { id: round.id, payload: JSON.stringify(round) },
        { id: synced.id, payload: JSON.stringify(synced) },
      ],
      pending_actions: [editRow, roundRow],
      server_rounds: [{ id: synced.id, payload: JSON.stringify(synced) }],
    },
  };
  try {
    await restoreBackup(backup);
    await restoreBackup(backup);
    expect(
      await tx.getAll('SELECT id FROM pending_actions ORDER BY sequence'),
    ).toEqual([{ id: editId }, { id: round.id }]);
  } finally {
    db.close();
  }
});
