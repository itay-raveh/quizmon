import { useCallback, useEffect, useRef, useState } from 'react';
import {
  downloadBackup,
  parseBackup,
  restoreBackup,
  validateBackupSize,
  type PlayerBackup,
} from '@/game/backup';
import type { PlayerData } from '@/game/player-data';
import { readPlayerData } from '@/game/player-storage';
import { GameButton } from './GameButton';
import { Toast } from './Toast';

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

export const BackupSettings = () => {
  const input = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<PlayerBackup | null>(null);
  const [error, setError] = useState('');
  const [downloadNotice, setDownloadNotice] = useState(0);
  const dismissDownloadNotice = useCallback(() => setDownloadNotice(0), []);
  const [busy, setBusy] = useState(false);
  const current = readPlayerData();

  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

  const readFile = async (file: File) => {
    setPreview(null);
    setError('');
    dismissDownloadNotice();
    setBusy(true);
    try {
      validateBackupSize(file.size);
      setPreview(parseBackup(await file.text()));
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

  return (
    <fieldset className="experience-setting backup-settings">
      <legend>Backup & restore</legend>
      <p>Your saved progress, Trainer profile, and settings.</p>
      <div className="backup-settings__actions">
        <GameButton
          tone="quiet"
          disabled={busy}
          onClick={() => {
            setError('');
            try {
              downloadBackup();
              setDownloadNotice((notice) => notice + 1);
            } catch {
              dismissDownloadNotice();
              setError(
                'Your saved data could not be exported. Check that site storage is available and try again.',
              );
            }
          }}
        >
          Download backup
        </GameButton>
        <GameButton
          tone="quiet"
          disabled={busy}
          ref={chooseButton}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Reading backup…' : 'Restore backup'}
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
      {preview && (
        <div
          className="backup-settings__preview"
          role="region"
          aria-label="Restore preview"
          aria-live="polite"
        >
          <h3 ref={previewHeading} tabIndex={-1}>
            Restore this backup?
          </h3>
          <p>
            Exported{' '}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(preview.exportedAt))}
          </p>
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
                  <td>{value(preview.save.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Replaces saved progress, profile, and settings, and ends unfinished
            rounds. Reminders stay on this device.
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
              onClick={() => {
                setError('');
                try {
                  restoreBackup(preview);
                  window.location.assign('/');
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : 'Restore failed. Your saved progress has not changed.',
                  );
                }
              }}
            >
              Replace and restore
            </GameButton>
          </div>
        </div>
      )}
    </fieldset>
  );
};
