import { readRecordedGame } from '../../domain/player/game-history';
import { rebuildGuestProgress } from '../../lib/storage/game-history';
import { getSaveIssue, clearSaveIssue } from '../../lib/storage/save-health';
import { readAccountIssues } from '../../lib/storage/account-issues';
import { localTables, type LocalRow } from '../../lib/storage/local-database';
import {
  getPlayerDatabase,
  parseLocalPlayerState,
  readState,
  transactPlayer,
  recoverPlayer,
  type LocalPlayerState,
} from '../../lib/storage/player-storage';
import { isRecord, isUtcTimestamp, isUuid } from '../../lib/validation';

const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

export interface PlayerBackup {
  exportedAt: string;
  format: 'quizmon-backup';
  version: 1;
  state: LocalPlayerState;
  reviewIssues?: { operationId: string; reason: string; payload: unknown }[];
  records: {
    pending_actions?: LocalRow[];
    local_actions: LocalRow[];
    local_completions: LocalRow[];
    completion_facts: LocalRow[];
  };
}

const createBackup = async (): Promise<PlayerBackup> =>
  getPlayerDatabase().readTransaction(async (transaction) => {
    const state = await readState(transaction);
    delete state.dailyAttempts;
    const backup: PlayerBackup = {
      exportedAt: new Date().toISOString(),
      format: 'quizmon-backup',
      version: 1,
      state,
      ...(state.account
        ? {
            reviewIssues: (await readAccountIssues(state, transaction)).map(
              ({ operationId, reason, payload }) => ({
                operationId,
                reason,
                payload,
              }),
            ),
          }
        : {}),
      records: {
        ...(state.account
          ? {
              pending_actions: await transaction.getAll<LocalRow>(
                'SELECT id,payload FROM pending_actions ORDER BY sequence',
              ),
            }
          : {}),
        local_actions: await transaction.getAll<LocalRow>(
          'SELECT id,payload FROM local_actions',
        ),
        local_completions: await transaction.getAll<LocalRow>(
          'SELECT id,payload FROM local_completions',
        ),
        completion_facts: state.account
          ? await transaction.getAll<LocalRow>(
              "SELECT completion_id AS id,json_object('completion',json(completion),'eligible',eligible) AS payload FROM completion_facts WHERE generation_id = ? ORDER BY revision",
              [state.account.generationId],
            )
          : [],
      },
    };
    validateBackupSize(new Blob([JSON.stringify(backup)]).size);
    return backup;
  });
export const validateBackupSize = (size: number): void => {
  if (size > MAX_BACKUP_BYTES) {
    throw new Error(
      'This file is too large. Choose a Quizmon backup under 512 MiB.',
    );
  }
};

export const parseBackup = (text: string): PlayerBackup => {
  validateBackupSize(new Blob([text]).size);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Quizmon backup.');
  }
  if (!isRecord(value) || value.format !== 'quizmon-backup') {
    throw new Error(
      'This is not a Quizmon backup. Choose a file exported from Quizmon.',
    );
  }
  if (value.version !== 1) {
    throw new Error(
      'This backup uses an unsupported version. Update Quizmon or choose another backup.',
    );
  }
  if (!isUtcTimestamp(value.exportedAt)) {
    throw new Error('This backup has an invalid date. Choose another backup.');
  }
  const state = parseLocalPlayerState(value.state);
  let reviewIssues: PlayerBackup['reviewIssues'];
  if (value.reviewIssues !== undefined) {
    if (!state.account || !Array.isArray(value.reviewIssues))
      throw new Error('The backup contains invalid account review details.');
    reviewIssues = value.reviewIssues.map((issue: unknown) => {
      if (
        !isRecord(issue) ||
        !isUuid(issue.operationId) ||
        typeof issue.reason !== 'string' ||
        !Object.hasOwn(issue, 'payload')
      )
        throw new Error('The backup contains invalid account review details.');
      return {
        operationId: issue.operationId,
        reason: issue.reason,
        payload: issue.payload,
      };
    });
    if (
      new Set(reviewIssues.map((issue) => issue.operationId)).size !==
      reviewIssues.length
    )
      throw new Error('The backup contains duplicate account review details.');
  }
  if (!isRecord(value.records))
    throw new Error('The backup contains invalid local records.');
  const readRows = (key: string): LocalRow[] => {
    const rows = value.records as Record<string, unknown>;
    const list = rows[key];
    if (
      !Array.isArray(list) ||
      !list.every(
        (row: unknown) =>
          isRecord(row) && isUuid(row.id) && typeof row.payload === 'string',
      )
    )
      throw new Error('The backup contains invalid local records.');
    const records = list as LocalRow[];
    if (new Set(records.map((row) => row.id)).size !== records.length)
      throw new Error('The backup contains duplicate record IDs.');
    for (const row of records) {
      const payload: unknown = JSON.parse(row.payload);
      if (!isRecord(payload))
        throw new Error('The backup contains a damaged record.');
      if (
        key === 'local_actions' &&
        (payload.operationId !== row.id ||
          (!state.account && payload.datasetId !== state.datasetId) ||
          !isUuid(payload.datasetId) ||
          payload.generationId !==
            (state.account?.generationId ?? state.datasetId) ||
          payload.payloadVersion !== 1 ||
          ![
            'completion.record',
            'discoveries.add',
            'profile.patch',
            'preferences.patch',
            'issue.dismiss',
          ].includes(String(payload.kind)) ||
          (payload.kind === 'issue.dismiss'
            ? !state.account || !isUuid(payload.payload)
            : !isRecord(payload.payload)))
      )
        throw new Error(
          'The backup contains an unsupported or mismatched action.',
        );
      if (
        key === 'local_completions' &&
        (typeof payload.hash !== 'string' ||
          !/^[a-f0-9]{64}$/.test(payload.hash) ||
          !isRecord(payload.outcome) ||
          typeof payload.outcome.isNewBest !== 'boolean')
      )
        throw new Error('The backup contains an invalid completion receipt.');
      if (key === 'local_completions' || key === 'completion_facts') {
        const game = readRecordedGame(payload.completion);
        if (
          game.completionId !== row.id ||
          ![true, false, 0, 1].includes(payload.eligible as boolean)
        )
          throw new Error('The backup contains an invalid game record.');
      }
    }
    return records;
  };
  return {
    exportedAt: value.exportedAt,
    format: 'quizmon-backup',
    version: 1,
    state,
    ...(reviewIssues ? { reviewIssues } : {}),
    records: {
      ...(state.account
        ? { pending_actions: readRows('pending_actions') }
        : {}),
      local_actions: readRows('local_actions'),
      local_completions: readRows('local_completions'),
      completion_facts: readRows('completion_facts'),
    },
  };
};

export const downloadBackup = async (): Promise<void> => {
  const backup = await createBackup();
  const trainerName = (backup.state.save.data.profile?.name ?? '')
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}\s]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  const blob = new Blob([JSON.stringify(backup)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `quizmon-backup-${trainerName ? `${trainerName}-` : ''}${backup.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const restoreBackup = async (backup: PlayerBackup): Promise<void> => {
  const validated = parseBackup(JSON.stringify(backup));
  const recovery = Boolean(getSaveIssue());
  await (recovery ? recoverPlayer : transactPlayer)(
    async (state, transaction) => {
      if (validated.state.account) {
        if (
          JSON.stringify(state.account) !==
          JSON.stringify(validated.state.account)
        )
          throw new Error(
            'Sign in to the same account and save generation to recover this backup.',
          );
        const pending = validated.records.pending_actions ?? [];
        for (const row of pending) {
          if (
            !validated.records.local_actions.some(
              (action) =>
                action.id === row.id && action.payload === row.payload,
            )
          )
            throw new Error(
              'The backup contains an unrecognized pending change.',
            );
          const [existing] = await transaction.getAll<LocalRow>(
            'SELECT id,payload FROM local_actions WHERE id = ?',
            [row.id],
          );
          if (existing) {
            if (existing.payload !== row.payload)
              throw new Error(
                'A change with this identity already contains different data.',
              );
            continue;
          }
          await transaction.execute(
            'INSERT INTO local_actions(id,payload) VALUES (?,?)',
            [row.id, row.payload],
          );
          await transaction.execute(
            'INSERT INTO pending_actions(id,payload,sequence) VALUES (?,?,(SELECT COALESCE(MAX(sequence),0)+1 FROM pending_actions))',
            [row.id, row.payload],
          );
        }
        return;
      }
      if (state.account)
        throw new Error(
          'Sign out before restoring a guest backup. Account progress stays separate.',
        );
      for (const table of localTables) {
        if (table !== 'local_state')
          await transaction.execute(`DELETE FROM ${table}`);
      }
      for (const table of ['local_actions', 'local_completions'] as const)
        for (const row of validated.records[table])
          await transaction.execute(
            `INSERT INTO ${table}(id,payload) VALUES (?,?)`,
            [row.id, row.payload],
          );
      Object.assign(state, validated.state);
      state.save = { ...validated.state.save, restoreId: crypto.randomUUID() };
      state.dailyAttempts = {};
      await rebuildGuestProgress(state, transaction);
    },
  );
  clearSaveIssue();
};
