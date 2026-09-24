import { archiveCompletion } from '../../domain/sync/round-facts';
import { completion } from '../../../tests/online/progress-fixtures';
import {
  emptyPlayerData,
  SAVE_SCHEMA_VERSION,
} from '../../domain/player/player-save';
import {
  parseBackup,
  verifyAccountBackupRecovery,
  type PlayerBackup,
} from './backup';

const recoveryAccess = vi.hoisted(() => ({
  accountRequest: vi.fn(),
  selectedAccount: vi.fn(),
  canRecoverAccountSave: vi.fn(),
}));
vi.mock('../account/account', () => ({
  accountRequest: recoveryAccess.accountRequest,
  selectedAccount: recoveryAccess.selectedAccount,
}));
vi.mock('../../lib/storage/player-storage', async (importOriginal) => ({
  ...(await importOriginal()),
  canRecoverAccountSave: recoveryAccess.canRecoverAccountSave,
}));

it('verifies the live owner before account backup recovery', async () => {
  const owner = { id: 'trainer', serverEpoch: crypto.randomUUID() };
  const backup = { state: { account: owner } } as PlayerBackup;
  recoveryAccess.canRecoverAccountSave.mockReturnValue(true);
  recoveryAccess.selectedAccount.mockReturnValue(owner.id);
  recoveryAccess.accountRequest.mockResolvedValue(owner);
  await expect(verifyAccountBackupRecovery(backup)).resolves.toBeUndefined();

  recoveryAccess.selectedAccount.mockReturnValue('other');
  await expect(verifyAccountBackupRecovery(backup)).rejects.toThrow(
    'backup account',
  );
  recoveryAccess.selectedAccount.mockReturnValue(owner.id);
  recoveryAccess.accountRequest.mockResolvedValue({ ...owner, id: 'other' });
  await expect(verifyAccountBackupRecovery(backup)).rejects.toThrow(
    'does not own',
  );
  recoveryAccess.accountRequest.mockResolvedValue({
    ...owner,
    serverEpoch: crypto.randomUUID(),
  });
  await expect(verifyAccountBackupRecovery(backup)).rejects.toThrow(
    'older account instance',
  );
  recoveryAccess.accountRequest.mockRejectedValue(
    Object.assign(new Error('Sign in again.'), { name: 'AccountSignIn' }),
  );
  await expect(verifyAccountBackupRecovery(backup)).rejects.toThrow(
    'Sign in again.',
  );
  recoveryAccess.accountRequest.mockRejectedValue(
    new TypeError('Failed to fetch'),
  );
  await expect(verifyAccountBackupRecovery(backup)).rejects.toThrow(
    'Connect to the account service',
  );
});

it('rejects malformed pending payloads and retains valid offline edits', () => {
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
  expect(() => parseBackup(JSON.stringify({ ...backup, version: 1 }))).toThrow(
    'unsupported version',
  );
  expect(() =>
    parseBackup(
      JSON.stringify({
        ...backup,
        records: {
          ...backup.records,
          pending_actions: [
            {
              id,
              payload: JSON.stringify({
                ...action,
                payload: { id, unit: 'name', value: 'Different' },
              }),
            },
          ],
        },
      }),
    ),
  ).toThrow('The backup contains an unrecognized pending change.');

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
  expect(() => parseBackup(JSON.stringify(malformed))).toThrow(
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
