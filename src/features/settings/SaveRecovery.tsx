import { Footer } from '@/app/Footer';
import { Logo } from '@/app/Logo';
import { site } from '@/app/site';
import { GameButton } from '@/components/GameButton';
import { PLAYER_SAVE_VERSION } from '@/domain/player/player-save';
import { AutomaticUpdate } from '@/features/installation/AutomaticUpdate';
import { useModalDialog } from '@/hooks/useModalDialog';
import { downloadJson } from '@/lib/download';
import {
  clearSaveIssue,
  getSaveIssue,
  subscribeToSaveIssue,
  type SaveIssue,
} from '@/lib/storage/save-health';
import {
  createRecoveryExport,
  inspectSavedData,
  resetSavedData,
} from '@/lib/storage/save-recovery';
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  parseBackup,
  restoreBackup,
  validateBackupSize,
  type PlayerBackup,
} from './backup';

const messages = {
  unsupported: {
    title: 'This save needs attention',
    message:
      'Your saved data uses a retired Quizmon format. Download a copy before restoring a current backup or starting fresh.',
  },
  newer: {
    title: 'Update Quizmon to load this save',
    message:
      'Your saved data comes from a newer version of Quizmon. Update the app, then try again. Your data has not changed.',
  },
  invalid: {
    title: 'Your saved data could not be loaded',
    message:
      'Some saved data could not be read. Download a copy before restoring a backup or starting fresh. Your data has not changed.',
  },
  unavailable: {
    title: 'Saved data is unavailable',
    message:
      'Your browser could not access site storage. Allow storage for Quizmon, then try again.',
  },
};

const SaveRecoveryDialog = ({
  issue,
  onRetry,
}: {
  issue: SaveIssue;
  onRetry: () => void;
}) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [preview, setPreview] = useState<PlayerBackup | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { dialogProps } = useModalDialog(() => {}, { initialFocus: heading });
  const copy = messages[issue.kind];
  const act = (action: () => void) => {
    setError('');
    try {
      action();
    } catch {
      setError(
        'Your browser could not complete that action. Your existing data has not been cleared.',
      );
    }
  };
  const readFile = async (file: File) => {
    setBusy(true);
    setPreview(null);
    setError('');
    setConfirmReset(false);
    try {
      validateBackupSize(file.size);
      setPreview(parseBackup(await file.text()));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'This backup could not be read.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <dialog
      {...dialogProps}
      onCancel={(event) => event.preventDefault()}
      className="save-recovery"
      aria-labelledby="save-recovery-title"
      aria-describedby="save-recovery-message"
    >
      <h1 id="save-recovery-title" tabIndex={-1} ref={heading}>
        {copy.title}
      </h1>
      <p id="save-recovery-message">{copy.message}</p>
      {issue.kind !== 'unavailable' && (
        <p>
          You can{' '}
          <a
            href={`mailto:${site.contactEmail}?subject=Quizmon%20save%20recovery`}
          >
            contact support
          </a>{' '}
          with the downloaded file for help recovering or converting it.
          Recovery may not be possible.
        </p>
      )}
      <div className="save-recovery__actions">
        {issue.kind !== 'unavailable' && (
          <GameButton
            disabled={busy}
            onClick={() =>
              act(() => {
                downloadJson('quizmon-recovery.json', createRecoveryExport());
                setNotice('Recovery file download started.');
              })
            }
          >
            Download saved data
          </GameButton>
        )}
        <GameButton tone="quiet" disabled={busy} onClick={onRetry}>
          Try again
        </GameButton>
        {issue.kind !== 'unavailable' && (
          <GameButton
            tone="quiet"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? 'Reading backup…' : 'Restore backup'}
          </GameButton>
        )}
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept=".json,application/json"
        aria-label="Choose recovery backup"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void readFile(file);
        }}
      />
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      {preview && (
        <section
          className="save-recovery__confirmation"
          aria-label="Restore preview"
        >
          <h2>Restore this backup?</h2>
          <p>
            {preview.save.data.pokedex.length} Pokédex entries and{' '}
            {Object.keys(preview.save.data.results.daily).length} Daily results.
            This replaces saved progress, profile, settings, and unfinished
            rounds on this device.
          </p>
          <div className="save-recovery__actions">
            <GameButton
              onClick={() =>
                act(() => {
                  restoreBackup(preview);
                  window.location.assign('/');
                })
              }
            >
              Replace and restore
            </GameButton>
            <GameButton tone="quiet" onClick={() => setPreview(null)}>
              Cancel restore
            </GameButton>
          </div>
        </section>
      )}
      {issue.kind !== 'unavailable' && issue.kind !== 'newer' && !preview && (
        <section className="save-recovery__confirmation">
          {confirmReset ? (
            <>
              <h2>Delete saved progress and start fresh?</h2>
              <p>
                This deletes progress, profile, settings, and unfinished rounds
                on this device. Download your saved data first if you want to
                keep a copy.
              </p>
              <div className="save-recovery__actions">
                <GameButton tone="quiet" onClick={() => setConfirmReset(false)}>
                  Keep saved data
                </GameButton>
                <GameButton
                  onClick={() =>
                    act(() => {
                      resetSavedData();
                      window.location.assign('/');
                    })
                  }
                >
                  Delete and start fresh
                </GameButton>
              </div>
            </>
          ) : (
            <GameButton tone="quiet" onClick={() => setConfirmReset(true)}>
              Start fresh
            </GameButton>
          )}
        </section>
      )}
      <details>
        <summary>Save details</summary>
        <p>
          {issue.message} Current save format: {PLAYER_SAVE_VERSION}.
        </p>
      </details>
    </dialog>
  );
};

export const SaveRecoveryBoundary = ({ children }: { children: ReactNode }) => {
  useState(() => {
    inspectSavedData();
    return true;
  });
  const issue = useSyncExternalStore(subscribeToSaveIssue, getSaveIssue);
  if (!issue) return children;
  return (
    <div className="app app--landing">
      {issue.kind === 'newer' && <AutomaticUpdate allowed />}
      <div className="background" aria-hidden="true" />
      <div className="app__screen">
        <main>
          <Logo />
        </main>
        <Footer showSupport={false} />
      </div>
      <SaveRecoveryDialog
        key={issue.kind}
        issue={issue}
        onRetry={() => {
          clearSaveIssue();
          inspectSavedData();
        }}
      />
    </div>
  );
};
