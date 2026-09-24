import { isRecord } from '../validation';
import type { LocalRow, LocalTransaction } from './local-database';
import {
  appendLocalAction,
  type LocalAction,
  type LocalPlayerState,
} from './player-storage';

export interface AccountIssue {
  ownerId: string;
  operationId: string;
  reason: string;
  payload: unknown;
  reapplicable?: boolean;
}

export async function readAccountIssues(
  state: LocalPlayerState,
  tx: LocalTransaction,
): Promise<AccountIssue[]> {
  if (!state.account) return [];
  const rows = await tx.getAll<{
    id: string;
    receipt: string;
    payload: string;
  }>(
    "SELECT a.id,a.payload,f.payload AS receipt FROM local_state f JOIN local_actions a ON a.id = substr(f.id,9) WHERE f.id LIKE 'failure:%' ORDER BY a.id",
  );
  return rows.map((row) => {
    const action = JSON.parse(row.payload) as LocalAction;
    const receipt: unknown = JSON.parse(row.receipt);
    if (!isRecord(receipt) || action.id !== row.id)
      throw new Error('A saved sync failure is damaged.');
    const reason =
      typeof receipt.reason === 'string'
        ? receipt.reason
        : typeof receipt.code === 'string'
          ? receipt.code
          : 'rejected';
    return {
      ownerId: state.account!.id,
      operationId: row.id,
      reason,
      payload: action.payload,
      reapplicable: action.kind === 'edit' && reason === 'needs_review',
    };
  });
}

export async function queueIssueResolution(
  state: LocalPlayerState,
  tx: LocalTransaction,
  issue: AccountIssue,
  reapply: boolean,
) {
  if (!state.account || state.account.id !== issue.ownerId)
    throw new Error(
      'The active account changed. Open Account to review it again.',
    );
  const [row] = await tx.getAll<LocalRow>(
    'SELECT id,payload FROM local_actions WHERE id = ?',
    [issue.operationId],
  );
  if (!row) return;
  const action = JSON.parse(row.payload) as LocalAction;
  if (reapply) {
    if (action.kind !== 'edit' || !isRecord(action.payload))
      throw new Error('This change cannot be reapplied.');
    const id = crypto.randomUUID();
    await appendLocalAction(state, tx, 'edit', { ...action.payload, id }, id);
  }
  if (action.kind === 'round') {
    await tx.execute('DELETE FROM local_completions WHERE id = ?', [
      issue.operationId,
    ]);
  }
  await tx.execute('DELETE FROM pending_actions WHERE id = ?', [
    issue.operationId,
  ]);
  await tx.execute('DELETE FROM local_state WHERE id = ?', [
    `failure:${issue.operationId}`,
  ]);
}
