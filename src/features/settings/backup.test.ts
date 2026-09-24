import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';
import { archiveCompletion } from '../../domain/sync/round-facts';
import { completion } from '../../../tests/online/progress-fixtures';
import { parseBackup, restoreBackup, type PlayerBackup } from './backup';

it('converts old rounds and keeps pending edits for review', () => {
  const datasetId = crypto.randomUUID();
  const old = {
    ...completion(datasetId, 'daily'),
    progressVersion: 1,
    generatorVersion: 0,
  };
  const action = {
    operationId: old.completionId,
    datasetId,
    generationId: crypto.randomUUID(),
    payloadVersion: 1,
    kind: 'completion.record',
    payload: old,
  };
  const edit = {
    ...action,
    operationId: crypto.randomUUID(),
    kind: 'profile.patch',
    payload: { unit: 'name', value: 'Trainer', expectedRevision: 0 },
  };
  const row = {
    id: old.completionId,
    payload: JSON.stringify({ completion: old, eligible: 1 }),
  };
  const backup = parseBackup(
    JSON.stringify({
      format: 'quizmon-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      state: {
        version: 1,
        datasetId,
        predecessors: {},
        account: {
          id: 'account-test',
          generationId: action.generationId,
          serverEpoch: crypto.randomUUID(),
        },
        save: { version: 1, restoreId: null, data: emptyPlayerData() },
      },
      records: {
        local_actions: [
          { id: action.operationId, payload: JSON.stringify(action) },
          { id: edit.operationId, payload: JSON.stringify(edit) },
        ],
        local_completions: [
          {
            id: old.completionId,
            payload: JSON.stringify({ completion: old, eligible: true }),
          },
        ],
        pending_actions: [
          { id: action.operationId, payload: JSON.stringify(action) },
          { id: edit.operationId, payload: JSON.stringify(edit) },
        ],
        completion_facts: [row],
      },
    }),
  );
  expect(backup.version).toBe(2);
  expect(backup.records.local_completions).toHaveLength(1);
  expect(backup.records.server_rounds).toHaveLength(1);
  expect(backup.records.pending_actions).toHaveLength(1);
  expect(backup.reviewIssues).toEqual([
    {
      operationId: edit.operationId,
      reason: 'needs_review',
      payload: { id: edit.operationId, unit: 'name', value: 'Trainer' },
    },
  ]);
  expect(JSON.parse(backup.records.server_rounds![0]!.payload)).toMatchObject({
    id: old.completionId,
    mode: 'daily',
    credited: true,
  });
});

it('rejects malformed pending payloads before restore and retains valid offline edits', async () => {
  const datasetId = crypto.randomUUID();
  const id = crypto.randomUUID();
  const action = {
    id,
    datasetId,
    kind: 'edit',
    payload: { id, unit: 'name', value: 'Trainer' },
  };
  const row = { id, payload: JSON.stringify(action) };
  const backup = {
    format: 'quizmon-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    state: {
      version: 2,
      datasetId,
      save: {
        version: SAVE_SCHEMA_VERSION,
        restoreId: null,
        data: emptyPlayerData(),
      },
      account: { id: 'trainer', serverEpoch: crypto.randomUUID() },
    },
    records: {
      local_actions: [row],
      local_completions: [],
      pending_actions: [row],
      server_rounds: [],
    },
  };
  expect(parseBackup(JSON.stringify(backup)).records.pending_actions).toEqual([
    row,
  ]);

  const malformed = {
    ...backup,
    records: {
      ...backup.records,
      local_actions: [
        {
          id,
          payload: JSON.stringify({
            ...action,
            payload: { id, unit: 'name', value: { broken: true } },
          }),
        },
      ],
      pending_actions: [],
    },
  };
  await expect(restoreBackup(malformed as PlayerBackup)).rejects.toThrow(
    'The backup contains an invalid action.',
  );

  const { credited: _credited, ...upload } = archiveCompletion(
    completion(datasetId),
  );
  void _credited;
  const brokenRound = {
    ...backup,
    records: {
      ...backup.records,
      local_actions: [
        {
          id: upload.id,
          payload: JSON.stringify({
            id: upload.id,
            datasetId,
            kind: 'round',
            payload: { ...upload, data: { ...upload.data, answers: [] } },
          }),
        },
      ],
      pending_actions: [],
    },
  };
  expect(() => parseBackup(JSON.stringify(brokenRound))).toThrow(
    'The backup contains an invalid action.',
  );
});

it('rejects divergent copies of a completed round but allows credit differences', () => {
  const datasetId = crypto.randomUUID();
  const round = archiveCompletion(completion(datasetId, 'daily'));
  const local = { id: round.id, payload: JSON.stringify(round) };
  const server = {
    id: round.id,
    payload: JSON.stringify({ ...round, credited: false }),
  };
  const backup = {
    format: 'quizmon-backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    state: {
      version: 2,
      datasetId,
      save: {
        version: SAVE_SCHEMA_VERSION,
        restoreId: null,
        data: emptyPlayerData(),
      },
      account: { id: 'trainer', serverEpoch: crypto.randomUUID() },
    },
    records: {
      local_actions: [],
      local_completions: [local],
      pending_actions: [],
      server_rounds: [server],
    },
  };
  expect(parseBackup(JSON.stringify(backup)).records.server_rounds).toEqual([
    server,
  ]);
  const changed = {
    ...round,
    credited: false,
    completed_at: new Date(Date.parse(round.completed_at) + 1000).toISOString(),
  };
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup,
        records: {
          ...backup.records,
          server_rounds: [{ id: round.id, payload: JSON.stringify(changed) }],
        },
      }),
    ),
  ).toThrow('The backup contains conflicting completed rounds.');
});
