import { emptyPlayerData } from '../../domain/player/player-save';
import { completion } from '../../../tests/online/progress-fixtures';
import { parseBackup } from './backup';

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
