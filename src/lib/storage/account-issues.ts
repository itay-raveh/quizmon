import { defaultGameSettings } from '../../domain/settings/game-settings';
import {
  canonical,
  trainingConfig,
  validAction,
  validEdit,
  type Action,
  type EditUnit,
  type EditValue,
} from '../../domain/sync/progress';
import { isRecord } from '../validation';
import type { LocalRow, LocalTransaction } from './local-database';
import { appendLocalAction, type LocalPlayerState } from './player-storage';

export interface AccountIssue {
  ownerId: string;
  generationId: string;
  operationId: string;
  reason: string;
  payload: unknown;
  resolving: boolean;
  edit?: {
    unit: EditUnit;
    requested: EditValue;
    accepted: EditValue;
    revision: number;
  };
}

const defaultEdits: Record<EditUnit, EditValue> = {
  avatar: null,
  name: '',
  partnerPokemon: null,
  specialty: null,
  answerFlow: defaultGameSettings.answerFlow,
  timerDisplay: defaultGameSettings.timerDisplay,
  training: trainingConfig(defaultGameSettings),
};

export async function readAccountIssues(
  state: LocalPlayerState,
  tx: LocalTransaction,
): Promise<AccountIssue[]> {
  if (!state.account) return [];
  const { id: ownerId, generationId } = state.account;
  const issues = new Map<string, AccountIssue>();
  const dismissed = new Set<string>();
  const receiptRevisions = new Map<string, number>();
  for (const row of await tx.getAll<{
    operation_id: string;
    reason: string;
    payload: string;
    dismissed: number;
  }>(
    'SELECT operation_id,reason,payload,dismissed FROM sync_issues WHERE owner_id = ? AND generation_id = ? ORDER BY operation_id',
    [ownerId, generationId],
  )) {
    if (row.dismissed) dismissed.add(row.operation_id);
    else
      issues.set(row.operation_id, {
        ownerId,
        generationId,
        operationId: row.operation_id,
        reason: row.reason,
        payload: JSON.parse(row.payload) as unknown,
        resolving: false,
      });
  }
  const failures = await tx.getAll<{
    id: string;
    receipt: string;
    payload: string;
  }>(
    "SELECT a.id,a.payload,f.payload AS receipt FROM local_state f JOIN local_actions a ON a.id = substr(f.id,9) WHERE f.id LIKE 'failure:%' ORDER BY a.id",
  );
  const failedIds = new Set(failures.map((row) => row.id));
  for (const row of failures) {
    if (dismissed.has(row.id) || issues.has(row.id)) continue;
    const action: unknown = JSON.parse(row.payload);
    const receipt: unknown = JSON.parse(row.receipt);
    if (
      validAction(action) &&
      action.generationId === generationId &&
      isRecord(receipt) &&
      typeof receipt.code === 'string'
    ) {
      if (typeof receipt.revision === 'number')
        receiptRevisions.set(row.id, receipt.revision);
      issues.set(row.id, {
        ownerId,
        generationId,
        operationId: row.id,
        reason: receipt.code,
        payload: action.payload,
        resolving: false,
      });
    }
  }
  for (const row of await tx.getAll<LocalRow>(
    'SELECT id,payload FROM pending_actions',
  )) {
    const action: unknown = JSON.parse(row.payload);
    if (
      !failedIds.has(row.id) &&
      !issues.has(row.id) &&
      !dismissed.has(row.id) &&
      validAction(action) &&
      action.generationId === generationId &&
      action.kind === 'issue.dismiss' &&
      typeof action.payload === 'string'
    ) {
      const issue = issues.get(action.payload);
      if (issue) issue.resolving = true;
    }
  }
  const [base] = await tx.getAll<{
    edits: string;
    edit_revisions: string;
    revision: number;
  }>(
    'SELECT edits,edit_revisions,revision FROM account_state WHERE id = ? AND generation_id = ?',
    [ownerId, generationId],
  );
  if (base) {
    const edits: unknown = JSON.parse(base.edits);
    const revisions: unknown = JSON.parse(base.edit_revisions);
    if (!isRecord(edits) || !isRecord(revisions))
      throw new Error('Account changes could not be read. Try syncing again.');
    for (const issue of issues.values()) {
      if (base.revision < (receiptRevisions.get(issue.operationId) ?? 0))
        continue;
      if (issue.reason !== 'edit_conflict' || !validEdit(issue.payload))
        continue;
      const { unit, value: requested } = issue.payload;
      const accepted = Object.hasOwn(edits, unit)
        ? edits[unit]
        : defaultEdits[unit];
      const revision = revisions[unit] ?? 0;
      if (validEdit({ unit, value: accepted, expectedRevision: revision }))
        issue.edit = {
          unit,
          requested,
          accepted: accepted as EditValue,
          revision: revision as number,
        };
    }
  }
  return [...issues.values()];
}

export async function queueIssueResolution(
  state: LocalPlayerState,
  tx: LocalTransaction,
  reviewed: AccountIssue,
  reapply: boolean,
) {
  if (
    !state.account ||
    state.account.id !== reviewed.ownerId ||
    state.account.generationId !== reviewed.generationId
  )
    throw new Error(
      'The active save changed. Open Account to review it again.',
    );
  const issues = await readAccountIssues(state, tx);
  const current = issues.find(
    (issue) => issue.operationId === reviewed.operationId,
  );
  if (!current || current.resolving) return;
  if (reapply) {
    if (
      !current.edit ||
      !reviewed.edit ||
      canonical(current.edit) !== canonical(reviewed.edit)
    )
      throw new Error(
        'The account value changed. Review it before trying again.',
      );
    const { unit, requested, revision } = current.edit;
    const pending = await tx.getAll<LocalRow>(
      "SELECT id,payload FROM pending_actions WHERE id NOT IN (SELECT substr(id,9) FROM local_state WHERE id LIKE 'failure:%') AND id NOT IN (SELECT operation_id FROM sync_issues WHERE owner_id = ? AND generation_id = ?)",
      [state.account.id, state.account.generationId],
    );
    if (
      pending.some((row) => {
        const action: unknown = JSON.parse(row.payload);
        return (
          validAction(action) &&
          validEdit(action.payload) &&
          action.payload.unit === unit
        );
      })
    )
      throw new Error(
        'Another edit to this setting is waiting to sync. Review it after syncing.',
      );
    const kind: Action['kind'] = [
      'avatar',
      'name',
      'partnerPokemon',
      'specialty',
    ].includes(unit)
      ? 'profile.patch'
      : 'preferences.patch';
    await appendLocalAction(state, tx, kind, {
      unit,
      value: requested,
      expectedRevision: revision,
    });
  }
  await appendLocalAction(state, tx, 'issue.dismiss', current.operationId);
}
