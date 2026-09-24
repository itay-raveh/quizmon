import { readRecordedGame } from '../../domain/player/game-history';
import { canonical, validAction } from '../../domain/sync/progress';
import {
  archiveCompletion,
  validateRoundFact,
} from '../../domain/sync/round-facts';
import { downloadJson } from '../../lib/download';
import { rebuildGuestProgress } from '../../lib/storage/game-history';
import { getSaveIssue, clearSaveIssue } from '../../lib/storage/save-health';
import { readAccountIssues } from '../../lib/storage/account-issues';
import { convertSavedActionV1 } from '../../lib/storage/save-compatibility';
import { parseSavedPlayerStateV1 } from '../../lib/storage/saved-state-v1';
import { localTables, type LocalRow } from '../../lib/storage/local-database';
import {
  getPlayerDatabase,
  parseLocalPlayerState,
  readState,
  transactPlayer,
  recoverPlayer,
  type LocalAction,
  type LocalPlayerState,
} from '../../lib/storage/player-storage';
import { isRecord, isUtcTimestamp, isUuid } from '../../lib/validation';

const MAX_BACKUP_BYTES = 512 * 1024 * 1024;

export interface PlayerBackup {
  exportedAt: string;
  format: 'quizmon-backup';
  version: 2;
  state: LocalPlayerState;
  reviewIssues?: { operationId: string; reason: string; payload: unknown }[];
  records: {
    pending_actions?: LocalRow[];
    local_actions: LocalRow[];
    local_completions: LocalRow[];
    server_rounds?: LocalRow[];
  };
}

export const validateBackupSize = (size: number): void => {
  if (size > MAX_BACKUP_BYTES)
    throw new Error(
      'This file is too large. Choose a Quizmon backup under 512 MiB.',
    );
};

const createBackup = async (): Promise<PlayerBackup> =>
  getPlayerDatabase().readTransaction(async (tx) => {
    const state = await readState(tx);
    delete state.dailyAttempts;
    const backup: PlayerBackup = {
      exportedAt: new Date().toISOString(),
      format: 'quizmon-backup',
      version: 2,
      state,
      ...(state.account
        ? {
            reviewIssues: (await readAccountIssues(state, tx)).map(
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
              pending_actions: await tx.getAll<LocalRow>(
                'SELECT id,payload FROM pending_actions ORDER BY sequence',
              ),
              server_rounds: (
                await tx.getAll<LocalRow>(
                  "SELECT id,json_object('id',id,'mode',mode,'day',day,'puzzle_id',puzzle_id,'started_on',started_on,'completed_at',completed_at,'credited',json(CASE WHEN credited=1 THEN 'true' ELSE 'false' END),'data',json(data)) AS payload FROM round WHERE player_id = ?",
                  [state.account.id],
                )
              ).map((row) => {
                const fact = JSON.parse(row.payload) as {
                  completed_at: string;
                };
                return {
                  id: row.id,
                  payload: JSON.stringify({
                    ...fact,
                    completed_at: new Date(fact.completed_at).toISOString(),
                  }),
                };
              }),
            }
          : {}),
        local_actions: await tx.getAll<LocalRow>(
          'SELECT id,payload FROM local_actions',
        ),
        local_completions: await tx.getAll<LocalRow>(
          'SELECT id,payload FROM local_completions',
        ),
      },
    };
    validateBackupSize(new Blob([JSON.stringify(backup)]).size);
    return backup;
  });

function readRows(
  records: Record<string, unknown>,
  key: string,
  optional = false,
): LocalRow[] {
  if (optional && records[key] === undefined) return [];
  const value = records[key];
  if (
    !Array.isArray(value) ||
    !value.every(
      (row) =>
        isRecord(row) && isUuid(row.id) && typeof row.payload === 'string',
    )
  )
    throw new Error('The backup contains invalid local records.');
  const rows = value as LocalRow[];
  if (new Set(rows.map((row) => row.id)).size !== rows.length)
    throw new Error('The backup contains duplicate record IDs.');
  return rows;
}

function convertBackupV1(value: Record<string, unknown>): PlayerBackup {
  const old = parseSavedPlayerStateV1(value.state);
  if (!isRecord(value.records))
    throw new Error('The backup contains invalid local records.');
  const records = value.records;
  const actions = readRows(records, 'local_actions').flatMap((row) => {
    const action: unknown = JSON.parse(row.payload);
    if (!validAction(action) || action.operationId !== row.id)
      throw new Error('The backup contains an invalid old action.');
    const converted = convertSavedActionV1(action);
    return converted
      ? [{ id: row.id, payload: JSON.stringify(converted) }]
      : [];
  });
  const converted = new Map(actions.map((row) => [row.id, row.payload]));
  const completions = readRows(records, 'local_completions').map((row) => {
    const receipt: unknown = JSON.parse(row.payload);
    if (!isRecord(receipt) || typeof receipt.eligible !== 'boolean')
      throw new Error('The backup contains an invalid old completion.');
    const completion = readRecordedGame(receipt.completion);
    if (completion.completionId !== row.id)
      throw new Error('The backup contains a mismatched old completion.');
    return {
      id: row.id,
      payload: JSON.stringify(archiveCompletion(completion, receipt.eligible)),
    };
  });
  const pending = old.account
    ? readRows(records, 'pending_actions').flatMap((row) => {
        const payload = converted.get(row.id);
        return payload ? [{ id: row.id, payload }] : [];
      })
    : undefined;
  const serverRounds = old.account
    ? readRows(records, 'completion_facts').map((row) => {
        const receipt: unknown = JSON.parse(row.payload);
        if (
          !isRecord(receipt) ||
          ![true, false, 0, 1].includes(receipt.eligible as boolean)
        )
          throw new Error('The backup contains an invalid old account round.');
        const completion = readRecordedGame(receipt.completion);
        if (completion.completionId !== row.id)
          throw new Error(
            'The backup contains a mismatched old account round.',
          );
        return {
          id: row.id,
          payload: JSON.stringify(
            archiveCompletion(completion, Boolean(receipt.eligible)),
          ),
        };
      })
    : undefined;
  return {
    exportedAt: value.exportedAt as string,
    format: 'quizmon-backup',
    version: 2,
    state: {
      version: 2,
      datasetId: old.datasetId,
      save: old.save,
      ...(old.account
        ? {
            account: {
              id: old.account.id,
              serverEpoch: old.account.serverEpoch,
            },
          }
        : {}),
    },
    records: {
      local_actions: actions,
      local_completions: completions,
      ...(pending
        ? { pending_actions: pending, server_rounds: serverRounds }
        : {}),
    },
  };
}

export const parseBackup = (text: string): PlayerBackup => {
  validateBackupSize(new Blob([text]).size);
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose a Quizmon backup.');
  }
  if (!isRecord(raw) || raw.format !== 'quizmon-backup')
    throw new Error(
      'This is not a Quizmon backup. Choose a file exported from Quizmon.',
    );
  if (!isUtcTimestamp(raw.exportedAt))
    throw new Error('This backup has an invalid date. Choose another backup.');
  if (raw.version !== 1 && raw.version !== 2)
    throw new Error(
      'This backup uses an unsupported version. Update Quizmon or choose another backup.',
    );
  const value = raw.version === 1 ? convertBackupV1(raw) : raw;
  const state = parseLocalPlayerState(value.state);
  if (!isRecord(value.records))
    throw new Error('The backup contains invalid local records.');
  const records = value.records;
  const actions = readRows(records, 'local_actions');
  for (const row of actions) {
    const action = JSON.parse(row.payload) as LocalAction;
    if (
      action.id !== row.id ||
      !isUuid(action.datasetId) ||
      !['round', 'edit'].includes(action.kind) ||
      !isRecord(action.payload) ||
      action.payload.id !== row.id
    )
      throw new Error('The backup contains an invalid action.');
  }
  const completions = readRows(records, 'local_completions');
  const serverRounds = state.account
    ? readRows(records, 'server_rounds', true)
    : [];
  for (const row of [...completions, ...serverRounds]) {
    const round: unknown = JSON.parse(row.payload);
    if (!validateRoundFact(round) || round.id !== row.id)
      throw new Error('The backup contains an invalid completed round.');
  }
  const pending = state.account
    ? readRows(records, 'pending_actions')
    : undefined;
  if (
    pending &&
    pending.some(
      (row) =>
        !actions.some(
          (action) => action.id === row.id && action.payload === row.payload,
        ),
    )
  )
    throw new Error('The backup contains an unrecognized pending change.');
  return {
    exportedAt: value.exportedAt as string,
    format: 'quizmon-backup',
    version: 2,
    state,
    records: {
      local_actions: actions,
      local_completions: completions,
      ...(pending
        ? { pending_actions: pending, server_rounds: serverRounds }
        : {}),
    },
    ...(Array.isArray(value.reviewIssues)
      ? { reviewIssues: value.reviewIssues as PlayerBackup['reviewIssues'] }
      : {}),
  };
};

export const downloadBackup = async (): Promise<void> => {
  const backup = await createBackup();
  const trainerName = (backup.state.save.data.profile?.name ?? '')
    .replace(/[<>:"/\\|?*\p{Cc}\p{Cf}\s]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  downloadJson(
    `quizmon-backup-${trainerName ? `${trainerName}-` : ''}${backup.exportedAt.slice(0, 10)}.json`,
    backup,
  );
};

export const restoreBackup = async (backup: PlayerBackup): Promise<void> => {
  const validated = parseBackup(JSON.stringify(backup));
  const recovery = Boolean(getSaveIssue());
  await (recovery ? recoverPlayer : transactPlayer)(async (state, tx) => {
    if (validated.state.account) {
      if (state.account?.id !== validated.state.account.id)
        throw new Error('Sign in to the same account to recover this backup.');
      const rounds = new Map(
        [
          ...validated.records.local_completions,
          ...(validated.records.server_rounds ?? []),
        ].map((row) => [row.id, row]),
      );
      for (const row of rounds.values()) {
        const [existing] = await tx.getAll<LocalRow>(
          'SELECT id,payload FROM local_completions WHERE id = ?',
          [row.id],
        );
        const archived = JSON.parse(row.payload) as { credited: boolean };
        if (
          existing &&
          canonical({
            ...(JSON.parse(existing.payload) as object),
            credited: true,
          }) !== canonical({ ...archived, credited: true })
        )
          throw new Error(
            'A completed round with this ID has different saved data.',
          );
        await tx.execute(
          'INSERT OR REPLACE INTO local_completions(id,payload) VALUES (?,?)',
          [row.id, row.payload],
        );
        const [oldAction] = await tx.getAll<LocalRow>(
          'SELECT id,payload FROM local_actions WHERE id = ?',
          [row.id],
        );
        let actionText = oldAction?.payload;
        if (!oldAction) {
          const { credited: _credited, ...payload } = archived;
          void _credited;
          const action: LocalAction = {
            id: row.id,
            datasetId: state.datasetId,
            kind: 'round',
            payload,
          };
          actionText = JSON.stringify(action);
          await tx.execute(
            'INSERT INTO local_actions(id,payload) VALUES (?,?)',
            [row.id, actionText],
          );
        }
        await tx.execute(
          'INSERT OR IGNORE INTO pending_actions(id,payload,sequence) VALUES (?,?,(SELECT COALESCE(MAX(sequence),0)+1 FROM pending_actions))',
          [row.id, actionText],
        );
      }
      for (const row of validated.records.pending_actions ?? []) {
        const [existing] = await tx.getAll<LocalRow>(
          'SELECT id,payload FROM local_actions WHERE id = ?',
          [row.id],
        );
        if (existing && existing.payload !== row.payload)
          throw new Error('A change with this ID contains different data.');
        if (!existing)
          await tx.execute(
            'INSERT INTO local_actions(id,payload) VALUES (?,?)',
            [row.id, row.payload],
          );
        await tx.execute(
          'INSERT OR IGNORE INTO pending_actions(id,payload,sequence) VALUES (?,?,(SELECT COALESCE(MAX(sequence),0)+1 FROM pending_actions))',
          [row.id, row.payload],
        );
      }
      return;
    }
    if (state.account)
      throw new Error('Sign out before restoring a guest backup.');
    for (const table of localTables)
      if (table !== 'local_state') await tx.execute(`DELETE FROM ${table}`);
    for (const table of ['local_actions', 'local_completions'] as const)
      for (const row of validated.records[table])
        await tx.execute(`INSERT INTO ${table}(id,payload) VALUES (?,?)`, [
          row.id,
          row.payload,
        ]);
    Object.assign(state, validated.state);
    state.save = { ...validated.state.save, restoreId: crypto.randomUUID() };
    state.dailyAttempts = {};
    await rebuildGuestProgress(state, tx);
  });
  clearSaveIssue();
};
