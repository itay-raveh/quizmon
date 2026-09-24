import { DatabaseSync } from 'node:sqlite';
import { completion } from '../../../tests/online/progress-fixtures';
import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';
import { archiveCompletion } from '../../domain/sync/round-facts';
import { queueIssueResolution, readAccountIssues } from './account-issues';
import { projectAccount } from './account-projection';
import type { LocalTransaction } from './local-database';
import type { LocalPlayerState } from './player-storage';

it('removes rejected round progress while retaining its review evidence', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE local_state (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE local_actions (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE local_completions (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE pending_actions (id TEXT PRIMARY KEY, payload TEXT, sequence INTEGER);
    CREATE TABLE player (id TEXT PRIMARY KEY, joined_on TEXT);
    CREATE TABLE round (id TEXT PRIMARY KEY, player_id TEXT);
  `);
  const tx = {
    getAll: (sql: string, params: unknown[] = []) =>
      Promise.resolve(db.prepare(sql).all(...(params as string[]))),
    execute: (sql: string, params: unknown[] = []) =>
      Promise.resolve(db.prepare(sql).run(...(params as string[]))),
  } as unknown as LocalTransaction;
  const datasetId = crypto.randomUUID();
  const round = archiveCompletion(completion(datasetId));
  const { credited: _credited, ...upload } = round;
  void _credited;
  const action = { id: round.id, datasetId, kind: 'round', payload: upload };
  const fresh = (): LocalPlayerState => ({
    version: 2,
    datasetId,
    save: {
      version: SAVE_SCHEMA_VERSION,
      restoreId: null,
      data: emptyPlayerData(),
    },
    account: { id: 'trainer', serverEpoch: crypto.randomUUID() },
  });
  try {
    await tx.execute('INSERT INTO player(id,joined_on) VALUES (?,?)', [
      'trainer',
      round.completed_at,
    ]);
    await tx.execute('INSERT INTO local_completions(id,payload) VALUES (?,?)', [
      round.id,
      JSON.stringify(round),
    ]);
    await tx.execute('INSERT INTO local_actions(id,payload) VALUES (?,?)', [
      round.id,
      JSON.stringify(action),
    ]);
    const before = fresh();
    await projectAccount(before, tx);
    expect(before.save.data.pokedex).toContain('bulbasaur');

    await tx.execute('INSERT INTO local_state(id,payload) VALUES (?,?)', [
      `failure:${round.id}`,
      JSON.stringify({ reason: 'invalid_round' }),
    ]);
    await tx.execute('DELETE FROM player');
    const rejected = fresh();
    await projectAccount(rejected, tx);
    expect(rejected.save.data.pokedex).toEqual([]);
    expect(rejected.save.data.results.training).toEqual({});

    const [issue] = await readAccountIssues(rejected, tx);
    await queueIssueResolution(rejected, tx, issue!, false);
    const dismissed = fresh();
    await projectAccount(dismissed, tx);
    expect(dismissed.save.data.pokedex).toEqual([]);
    expect(await readAccountIssues(dismissed, tx)).toEqual([]);
    expect(await tx.getAll('SELECT id FROM local_completions')).toEqual([]);
    expect(await tx.getAll('SELECT id FROM local_actions')).toEqual([
      { id: round.id },
    ]);
  } finally {
    db.close();
  }
});
