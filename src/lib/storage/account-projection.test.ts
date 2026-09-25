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
import { clearSaveIssue, getSaveIssue } from './save-health';

it('retains review evidence and prunes only matching downloaded rounds after acknowledgement', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE local_state (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE local_actions (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE local_completions (id TEXT PRIMARY KEY, payload TEXT);
    CREATE TABLE pending_actions (id TEXT PRIMARY KEY, payload TEXT, sequence INTEGER);
    CREATE TABLE player (id TEXT PRIMARY KEY, joined_on TEXT, question_types TEXT, auto_types TEXT);
    CREATE TABLE round (id TEXT PRIMARY KEY, player_id TEXT, mode TEXT, day TEXT, puzzle_id TEXT, started_on TEXT, completed_at TEXT, credited INTEGER, data TEXT);
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
    await tx.execute(
      'INSERT INTO player(id,joined_on,question_types,auto_types) VALUES (?,?,?,?)',
      [
        'trainer',
        round.completed_at,
        JSON.stringify(['evolution-items', 'type-check']),
        JSON.stringify(['evolution-items']),
      ],
    );
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
    expect(before.save.data.settings?.questionTypes).toEqual(['type-check']);
    expect(before.save.data.settings?.automaticQuestionTypes).toEqual([]);

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

    await tx.execute(
      'INSERT INTO round(id,player_id,mode,day,puzzle_id,started_on,completed_at,credited,data) VALUES (?,?,?,?,?,?,?,?,?)',
      [
        round.id,
        'trainer',
        round.mode,
        round.day,
        round.puzzle_id,
        round.started_on,
        round.completed_at,
        1,
        JSON.stringify(round.data),
      ],
    );
    await tx.execute('INSERT INTO local_completions(id,payload) VALUES (?,?)', [
      round.id,
      JSON.stringify(round),
    ]);
    await tx.execute(
      'INSERT INTO pending_actions(id,payload,sequence) VALUES (?,?,?)',
      [round.id, JSON.stringify(action), 1],
    );
    await projectAccount(fresh(), tx);
    expect(await tx.getAll('SELECT id FROM local_completions')).toEqual([
      { id: round.id },
    ]);

    await tx.execute('DELETE FROM pending_actions WHERE id = ?', [round.id]);
    const accepted = fresh();
    await projectAccount(accepted, tx);
    expect(await tx.getAll('SELECT id FROM local_completions')).toEqual([]);
    expect(accepted.save.data.pokedex).toContain('bulbasaur');

    const changed = { ...round, completed_at: '2026-09-12T00:00:00.000Z' };
    await tx.execute('INSERT INTO local_completions(id,payload) VALUES (?,?)', [
      round.id,
      JSON.stringify(changed),
    ]);
    await expect(projectAccount(fresh(), tx)).rejects.toThrow(
      'differs from its saved copy',
    );
    expect(getSaveIssue()?.kind).toBe('invalid');
    expect(await tx.getAll('SELECT payload FROM local_completions')).toEqual([
      { payload: JSON.stringify(changed) },
    ]);
  } finally {
    clearSaveIssue();
    db.close();
  }
});
