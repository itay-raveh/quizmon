import { useEffect, useRef, useState } from 'react';
import {
  downloadBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  restoreBackup,
  type PlayerBackup,
} from '@/game/backup';
import { readPlayerData } from '@/game/player-storage';
import { GameButton } from './GameButton';

export const BackupSettings = () => {
  const input = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [preview, setPreview] = useState<PlayerBackup | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = readPlayerData();

  useEffect(() => {
    if (preview) previewHeading.current?.focus();
  }, [preview]);

  const readFile = async (file: File) => {
    setPreview(null);
    setError('');
    setBusy(true);
    try {
      if (file.size > MAX_BACKUP_BYTES)
        throw new Error(
          'This file is too large. Choose a Quizmon backup under 10 MB.',
        );
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
      <legend>Progress backup</legend>
      <p>
        Save your Trainer profile, progress, and settings to a file, or restore
        them on another device. Unsaved settings are not included.
      </p>
      <div className="backup-settings__actions">
        <GameButton
          tone="quiet"
          disabled={busy}
          onClick={() => {
            setError('');
            try {
              downloadBackup();
            } catch {
              setError(
                'Your saved data could not be exported. Check that site storage is available and try again.',
              );
            }
          }}
        >
          Export backup
        </GameButton>
        <GameButton
          tone="quiet"
          disabled={busy}
          ref={chooseButton}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Reading backup…' : 'Choose backup'}
        </GameButton>
      </div>
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
              <tr>
                <th scope="row">Trainer</th>
                <td>{current.profile?.name || 'Unnamed'}</td>
                <td>{preview.save.data.profile?.name || 'Unnamed'}</td>
              </tr>
              <tr>
                <th scope="row">Daily results</th>
                <td>{Object.keys(current.results.daily).length}</td>
                <td>{Object.keys(preview.save.data.results.daily).length}</td>
              </tr>
              <tr>
                <th scope="row">Pokédex entries</th>
                <td>{current.pokedex.length}</td>
                <td>{preview.save.data.pokedex.length}</td>
              </tr>
              <tr>
                <th scope="row">League won</th>
                <td>{current.results.league.completed ? 'Yes' : 'No'}</td>
                <td>
                  {preview.save.data.results.league.completed ? 'Yes' : 'No'}
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            This replaces your saved progress, Trainer profile, and settings,
            and ends any unfinished round. Daily reminders stay on this device.
            Export your current data first if you want to keep it.
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
