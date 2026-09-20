import { SAVE_SCHEMA_VERSION } from '../../domain/player/player-save';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { openLocalDatabase } from '../../../tests/fixtures/local-database';
import { emptyPlayerData } from '../../domain/player/player-save';
import { type Action } from '../../domain/sync/progress';
import {
  queueIssueResolution,
  readAccountIssues,
  type AccountIssue,
} from './account-issues';
import { projectAccount } from './account-projection';
import type { LocalRow } from './local-database';
import { appendLocalAction, type LocalPlayerState } from './player-storage';

let db: ReturnType<typeof openLocalDatabase>;
let state: LocalPlayerState;
let original: Action;
beforeEach(async () => {
  db = openLocalDatabase();
  await db.init();
  state = {
    version: 1,
    datasetId: crypto.randomUUID(),
    account: {
      id: 'account-one',
      generationId: crypto.randomUUID(),
      serverEpoch: crypto.randomUUID(),
    },
    save: {
      version: SAVE_SCHEMA_VERSION,
      restoreId: null,
      data: emptyPlayerData(),
    },
    predecessors: {},
  };
  for (const sql of [
    'CREATE TABLE pending_actions(id TEXT PRIMARY KEY,payload TEXT,sequence INTEGER)',
    'CREATE TABLE sync_issues(id TEXT PRIMARY KEY,owner_id TEXT,generation_id TEXT,operation_id TEXT,reason TEXT,payload TEXT,dismissed INTEGER)',
    'CREATE TABLE account_state(id TEXT PRIMARY KEY,generation_id TEXT,revision INTEGER,edits TEXT,edit_revisions TEXT,profile_created_at TEXT)',
    'CREATE TABLE completion_facts(id TEXT,completion_id TEXT,generation_id TEXT,revision INTEGER,eligible INTEGER,completion TEXT)',
    'CREATE TABLE player_pokemon(generation_id TEXT,pokemon TEXT,discovered INTEGER,correct INTEGER)',
  ])
    await db.execute(sql);
  await db.execute('INSERT INTO account_state VALUES (?,?,?,?,?,?)', [
    state.account!.id,
    state.account!.generationId,
    7,
    JSON.stringify({ name: 'Accepted' }),
    JSON.stringify({ name: 6 }),
    '2026-09-01',
  ]);
  original = await appendLocalAction(state, db, 'profile.patch', {
    unit: 'name',
    value: 'Offline edit',
    expectedRevision: 0,
  });
});
async function receipt(
  action = original,
  code = 'edit_conflict',
  revision = 7,
) {
  await db.execute('INSERT INTO local_state(id,payload) VALUES (?,?)', [
    `failure:${action.operationId}`,
    JSON.stringify({
      operationId: action.operationId,
      status: 'conflict',
      code,
      revision,
    }),
  ]);
}
async function synced(
  action = original,
  dismissed = 0,
  owner = state.account!.id,
) {
  await db.execute('INSERT INTO sync_issues VALUES (?,?,?,?,?,?,?)', [
    crypto.randomUUID(),
    owner,
    action.generationId,
    action.operationId,
    'edit_conflict',
    JSON.stringify(action.payload),
    dismissed,
  ]);
}
async function review() {
  const issues = await db.readTransaction((tx) => readAccountIssues(state, tx));
  expect(issues).toHaveLength(1);
  return issues[0]!;
}
const choose = (issue: AccountIssue, reapply = false) =>
  db.writeTransaction((tx) => queueIssueResolution(state, tx, issue, reapply));
const actions = async () =>
  (
    await db.getAll<LocalRow>(
      'SELECT id,payload FROM pending_actions ORDER BY sequence',
    )
  ).map((row) => JSON.parse(row.payload) as Action);

it('shows a conflict received on another device, scoped to account and generation', async () => {
  await db.execute('DELETE FROM pending_actions');
  await db.execute('DELETE FROM local_actions');
  await synced();
  await synced(
    { ...original, operationId: crypto.randomUUID() },
    0,
    'another-account',
  );
  await synced({
    ...original,
    operationId: crypto.randomUUID(),
    generationId: crypto.randomUUID(),
  });
  expect(await review()).toMatchObject({
    edit: {
      unit: 'name',
      requested: 'Offline edit',
      accepted: 'Accepted',
      revision: 6,
    },
    resolving: false,
  });
});

it('shows an upload receipt immediately, but waits for its checkpoint before offering the accepted value', async () => {
  await receipt(original, 'edit_conflict', 8);
  expect((await review()).edit).toBeUndefined();
  await db.execute('UPDATE account_state SET revision=8');
  expect((await review()).edit?.accepted).toBe('Accepted');
  await synced();
  expect(await readAccountIssues(state, db)).toHaveLength(1);
});

it('keeps an offline dismissal pending, deduplicates clicks, and retains the failure receipt', async () => {
  await receipt();
  const issue = await review();
  await Promise.all([choose(issue), choose(issue)]);
  expect(
    (await actions()).filter((action) => action.kind === 'issue.dismiss'),
  ).toHaveLength(1);
  expect((await review()).resolving).toBe(true);
  expect(await db.getAll('SELECT * FROM local_state')).toHaveLength(1);
  await synced(original, 1);
  expect(await readAccountIssues(state, db)).toEqual([]);
});

it('reapplies with a fresh identity and the accepted revision, without the rejected predecessor', async () => {
  original.payload = {
    ...(original.payload as object),
    predecessorId: crypto.randomUUID(),
  };
  await db.execute('UPDATE local_actions SET payload=? WHERE id=?', [
    JSON.stringify(original),
    original.operationId,
  ]);
  await receipt();
  await choose(await review(), true);
  const queued = await actions();
  expect(queued).toHaveLength(3);
  expect(queued[1]).toMatchObject({
    kind: 'profile.patch',
    payload: { unit: 'name', value: 'Offline edit', expectedRevision: 6 },
  });
  expect(queued[1]!.payload).not.toHaveProperty('predecessorId');
  expect(queued[1]!.operationId).not.toBe(original.operationId);
  expect(queued[2]).toMatchObject({
    kind: 'issue.dismiss',
    payload: original.operationId,
  });
  await projectAccount(state, db);
  expect(state.save.data.profile?.name).toBe('Offline edit');
  expect(state.predecessors.name).toBe(queued[1]!.operationId);
});

it('rejects a stale review after a newer accepted edit, but still allows dismissal', async () => {
  await synced();
  const issue = await review();
  await db.execute('UPDATE account_state SET edits=?,edit_revisions=?', [
    JSON.stringify({ name: 'Newer' }),
    JSON.stringify({ name: 8 }),
  ]);
  await expect(choose(issue, true)).rejects.toThrow('account value changed');
  expect(await actions()).toHaveLength(1);
  await choose(issue);
  await projectAccount(state, db);
  expect(state.save.data.profile?.name).toBe('Newer');
});

it('does not replace another local edit waiting for acknowledgement', async () => {
  await synced();
  await appendLocalAction(state, db, 'profile.patch', {
    unit: 'name',
    value: 'New local edit',
    expectedRevision: 6,
  });
  await expect(choose(await review(), true)).rejects.toThrow('waiting to sync');
  expect(await actions()).toHaveLength(2);
});

it('refuses resolution after an account switch or generation reset', async () => {
  await synced();
  const issue = await review();
  const originalAccount = state.account!;
  state.account = { ...originalAccount, id: 'another-account' };
  await expect(choose(issue)).rejects.toThrow('active save changed');
  state.account = { ...originalAccount, generationId: crypto.randomUUID() };
  await expect(choose(issue)).rejects.toThrow('active save changed');
  expect(await actions()).toHaveLength(1);
});

it('rolls back the new edit if saving its dismissal fails', async () => {
  await synced();
  const issue = await review();
  await expect(
    db.writeTransaction((tx) =>
      queueIssueResolution(
        state,
        {
          ...tx,
          execute: (sql, parameters = []) => {
            if (
              parameters.some(
                (value) =>
                  typeof value === 'string' &&
                  value.includes('"kind":"issue.dismiss"'),
              )
            )
              throw new Error('Storage full');
            return tx.execute(sql, parameters);
          },
        },
        issue,
        true,
      ),
    ),
  ).rejects.toThrow('Storage full');
  expect(await actions()).toHaveLength(1);
  expect(await db.getAll('SELECT * FROM local_actions')).toHaveLength(1);
  expect((await review()).resolving).toBe(false);
});

it('keeps a new conflict reviewable if a reapplied edit also loses a race', async () => {
  await receipt();
  await choose(await review(), true);
  const reapplied = (await actions())[1]!;
  await synced(original, 1);
  await receipt(reapplied);
  const issue = await review();
  expect(issue.operationId).toBe(reapplied.operationId);
  expect(issue.resolving).toBe(false);
  await projectAccount(state, db);
  expect(state.save.data.profile?.name).toBe('Accepted');
});

it('does not resurrect a rejected edit when its synced issue is dismissed and local receipts are absent', async () => {
  await synced(original, 1);
  expect(await readAccountIssues(state, db)).toEqual([]);
  await projectAccount(state, db);
  expect(state.save.data.profile?.name).toBe('Accepted');
  expect(state.predecessors).toEqual({});
});

it('restores account defaults after rejecting its first edits and preserves device preferences', async () => {
  await db.execute('UPDATE account_state SET edits=?,edit_revisions=?', [
    '{}',
    '{}',
  ]);
  const specialty = await appendLocalAction(state, db, 'profile.patch', {
    unit: 'specialty',
    value: 'type',
    expectedRevision: 0,
  });
  const timer = await appendLocalAction(state, db, 'preferences.patch', {
    unit: 'timerDisplay',
    value: 'hidden',
    expectedRevision: 0,
  });
  state.save.data.settings = {
    ...defaultGameSettings,
    soundVolume: 0.2,
    reduceMotion: true,
  };
  await projectAccount(state, db);
  expect(state.save.data.profile).toMatchObject({
    name: 'Offline edit',
    specialty: 'type',
  });
  expect(state.save.data.settings?.timerDisplay).toBe('hidden');
  await receipt();
  await receipt(specialty, 'specialty_not_earned');
  await receipt(timer);
  await projectAccount(state, db);
  expect(state.save.data.profile).toMatchObject({ name: '', specialty: null });
  expect(state.save.data.settings).toMatchObject({
    timerDisplay: defaultGameSettings.timerDisplay,
    soundVolume: 0.2,
    reduceMotion: true,
  });
});

it('makes a failed dismissal reviewable without hiding the original conflict', async () => {
  await receipt();
  await choose(await review());
  await receipt((await actions())[1], 'invalid_issue');
  const issues = await readAccountIssues(state, db);
  expect(issues).toHaveLength(2);
  expect(issues.every((issue) => !issue.resolving)).toBe(true);
});
