import { useCallback, useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
import { Toast } from '../../components/Toast';
import type { PlayerData } from '../../domain/player/player-save';
import { readPlayerData } from '../../lib/storage/player-storage';
import {
  downloadBackup,
  parseBackup,
  restoreBackup,
  validateBackupSize,
  type PlayerBackup,
} from './backup';

const previewRows: {
  label: string;
  value: (data: PlayerData) => string | number;
}[] = [
  { label: 'Trainer', value: (data) => data.profile?.name || 'Unnamed' },
  {
    label: 'Daily results',
    value: (data) => Object.keys(data.results.daily).length,
  },
  { label: 'Pokédex entries', value: (data) => data.pokedex.length },
  { label: 'Hall of Fame records', value: (data) => data.hallOfFame.length },
  {
    label: 'League won',
    value: (data) => (data.results.league.completed ? 'Yes' : 'No'),
  },
];

export const BackupSettings = ({
  accountRecovery = false,
}: {
  accountRecovery?: boolean;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<PlayerBackup | null>(null);
  const [restored, setRestored] = useState<'guest' | 'account' | null>(null);
  const [error, setError] = useState('');
  const [downloadNotice, setDownloadNotice] = useState(0);
  const dismissDownloadNotice = useCallback(() => setDownloadNotice(0), []);
  const [busy, setBusy] = useState(false);
  const current = readPlayerData();
  const accountBackup = !!preview?.state.account;

  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

  const readFile = async (file: File) => {
    setPreview(null);
    setRestored(null);
    setError('');
    dismissDownloadNotice();
    setBusy(true);
    try {
      validateBackupSize(file.size);
      const backup = parseBackup(await file.text());
      if (accountRecovery && !backup.state.account)
        throw new Error('Choose a backup from this account.');
      setPreview(backup);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'This file could not be read. Choose another backup.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    setError('');
    setBusy(true);
    try {
      await downloadBackup();
      setDownloadNotice((notice) => notice + 1);
    } catch {
      dismissDownloadNotice();
      setError(
        'Your saved data could not be exported. Check that site storage is available and try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!preview) return;
    setError('');
    setBusy(true);
    try {
      await restoreBackup(preview);
      setPreview(null);
      setRestored(preview.state.account ? 'account' : 'guest');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Restore failed. Your saved progress has not changed.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="experience-setting backup-settings">
      <legend>
        {accountRecovery ? 'Device recovery' : 'Backup & restore'}
      </legend>
      <p>
        {accountRecovery
          ? 'Save a copy of changes waiting on this device, or recover them from a backup for this account.'
          : 'Your saved progress, Trainer profile, and settings.'}
      </p>
      <div className="backup-settings__actions">
        <GameButton
          tone="quiet"
          disabled={busy}
          onClick={() => {
            void handleDownload();
          }}
        >
          {accountRecovery ? 'Download device backup' : 'Download backup'}
        </GameButton>
        <GameButton
          tone="quiet"
          disabled={busy}
          ref={chooseButton}
          onClick={() => input.current?.click()}
        >
          {busy
            ? 'Reading backup…'
            : accountRecovery
              ? 'Recover from backup'
              : 'Restore backup'}
        </GameButton>
      </div>
      {downloadNotice > 0 && (
        <Toast
          key={downloadNotice}
          message="Backup download started."
          onDismiss={dismissDownloadNotice}
        />
      )}
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label="Choose backup file"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void readFile(file);
        }}
      />
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      <div role="status">
        {restored && (
          <p>
            {restored === 'account'
              ? 'Pending account changes recovered on this device.'
              : 'Backup restored. Your saved progress is ready.'}
          </p>
        )}
      </div>
      {preview && (
        <div
          className="backup-settings__preview"
          role="region"
          aria-label="Restore preview"
          aria-live="polite"
        >
          <h3 ref={previewHeading} tabIndex={-1}>
            {accountBackup
              ? 'Recover pending account changes?'
              : 'Restore this backup?'}
          </h3>
          <p>
            Exported{' '}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(preview.exportedAt))}
          </p>
          {!accountBackup && (
            <table aria-label="Current progress compared with the backup">
              <thead>
                <tr>
                  <th scope="col">Saved data</th>
                  <th scope="col">This device</th>
                  <th scope="col">Backup</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map(({ label, value }) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{value(current)}</td>
                    <td>{value(preview.state.save.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>
            {accountBackup
              ? 'Restores missing pending changes to the same account. Shared progress comes from sync. This does not replace account history or restore unfinished rounds.'
              : 'Replaces saved progress, profile, and settings, and ends unfinished rounds. Reminders stay on this device.'}
          </p>
          <div className="backup-settings__actions">
            <GameButton
              tone="quiet"
              onClick={() => {
                setPreview(null);
                chooseButton.current?.focus();
              }}
            >
              Cancel restore
            </GameButton>
            <GameButton
              disabled={busy}
              onClick={() => {
                void handleRestore();
              }}
            >
              {accountBackup
                ? 'Recover pending changes'
                : 'Replace and restore'}
            </GameButton>
          </div>
        </div>
      )}
    </fieldset>
  );
};
