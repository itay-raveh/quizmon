import {
  canRecoverAccountSave,
  canRecoverGuestSave,
} from '@/lib/storage/player-storage';
import { Footer } from '@/app/Footer';
import { Logo } from '@/app/Logo';
import { site } from '@/app/site';
import { GameButton } from '@/components/GameButton';
import { Sentry, sentryEnabled } from '@/lib/sentry';
import { AccountSettings } from '@/features/account/AccountSettings';
import { AutomaticUpdate } from '@/features/installation/AutomaticUpdate';
import { useModalDialog } from '@/hooks/useModalDialog';
import { downloadJson } from '@/lib/download';
import {
  getSaveIssue,
  subscribeToSaveIssue,
  type SaveIssue,
} from '@/lib/storage/save-health';
import {
  createRecoveryExport,
  resetSavedData,
} from '@/lib/storage/save-recovery';
import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  backupPreview,
  parseBackup,
  restoreBackup,
  validateBackupSize,
  verifyAccountBackupRecovery,
  type PlayerBackup,
} from './backup';

const messages = {
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
      'Quizmon could not open saved data on this device. Check that site storage is allowed, then try again.',
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
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const { dialogProps } = useModalDialog(() => {}, { initialFocus: heading });
  const copy = messages[issue.kind];
  const act = async (action: () => void | Promise<void>) => {
    setError('');
    try {
      setBusy(true);
      await action();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Your browser could not complete that action. Your existing data has not been cleared.',
      );
    } finally {
      setBusy(false);
    }
  };
  const readFile = async (file: File) => {
    setBusy(true);
    setPreview(null);
    setError('');
    setConfirmReset(false);
    let accountBackup = false;
    try {
      validateBackupSize(file.size);
      const backup = await parseBackup(await file.text());
      accountBackup = Boolean(backup.accountId);
      if (backup.accountId && canRecoverAccountSave())
        verifyAccountBackupRecovery(backup);
      else if (backup.accountId || !canRecoverGuestSave())
        throw new Error(
          canRecoverGuestSave()
            ? 'Choose a guest backup for this save.'
            : 'Choose a backup from this account.',
        );
      setNeedsSignIn(false);
      setPreview(backup);
    } catch (failure) {
      if (accountBackup && canRecoverAccountSave()) setNeedsSignIn(true);
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
              void act(async () => {
                downloadJson(
                  'quizmon-recovery.json',
                  await createRecoveryExport(),
                );
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
        {sentryEnabled && !reportOpen && (
          <GameButton tone="quiet" onClick={() => setReportOpen(true)}>
            Report a problem
          </GameButton>
        )}
        {issue.kind !== 'unavailable' &&
          (canRecoverGuestSave() || canRecoverAccountSave()) && (
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? 'Reading backup…' : 'Restore backup'}
            </GameButton>
          )}
      </div>
      {reportOpen && (
        <form
          className="save-recovery__report"
          onSubmit={(event) => {
            event.preventDefault();
            if (!report.trim() || sendingReport) return;
            setSendingReport(true);
            setReportStatus('');
            void Sentry.sendFeedback({
              message: `Save recovery (${issue.kind}): ${report.trim()}`,
              email: reportEmail.trim() || undefined,
            })
              .then(() => {
                setReportStatus('Report sent. Thank you.');
                setReport('');
              })
              .catch(() =>
                setReportStatus(
                  'Report could not be sent. Check your connection and try again.',
                ),
              )
              .finally(() => setSendingReport(false));
          }}
        >
          <label htmlFor="save-recovery-report">What happened?</label>
          <textarea
            id="save-recovery-report"
            required
            value={report}
            onChange={(event) => setReport(event.target.value)}
            placeholder="Tell us what you were doing when this appeared."
          />
          <label htmlFor="save-recovery-email">Email (optional)</label>
          <input
            id="save-recovery-email"
            type="email"
            value={reportEmail}
            onChange={(event) => setReportEmail(event.target.value)}
          />
          <GameButton disabled={sendingReport || !report.trim()} type="submit">
            {sendingReport ? 'Sending…' : 'Send report'}
          </GameButton>
          {reportStatus && <p role="status">{reportStatus}</p>}
        </form>
      )}
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
      {needsSignIn && <AccountSettings recoverySignIn />}
      {preview && (
        <section
          className="save-recovery__confirmation"
          aria-label="Restore preview"
        >
          <h2>Restore this backup?</h2>
          <p>
            {backupPreview(preview).pokedex.length} Pokédex entries and{' '}
            {Object.keys(backupPreview(preview).results.daily).length} Daily
            results.{' '}
            {preview.accountId
              ? 'This merges missing account rounds and device data.'
              : 'This merges completed rounds and device data, and applies the backup profile and settings.'}
          </p>
          <div className="save-recovery__actions">
            <GameButton
              onClick={() =>
                void act(async () => {
                  await restoreBackup(preview);
                  window.location.assign('/');
                })
              }
            >
              Merge and restore
            </GameButton>
            <GameButton tone="quiet" onClick={() => setPreview(null)}>
              Cancel restore
            </GameButton>
          </div>
        </section>
      )}
      {issue.kind !== 'unavailable' &&
        issue.kind !== 'newer' &&
        canRecoverGuestSave() &&
        !preview && (
          <section className="save-recovery__confirmation">
            {confirmReset ? (
              <>
                <h2>Delete saved progress and start fresh?</h2>
                <p>
                  This deletes progress, profile, settings, and unfinished
                  rounds on this device. Download your saved data first if you
                  want to keep a copy.
                </p>
                <div className="save-recovery__actions">
                  <GameButton
                    tone="quiet"
                    onClick={() => setConfirmReset(false)}
                  >
                    Keep saved data
                  </GameButton>
                  <GameButton
                    onClick={() =>
                      void act(async () => {
                        await resetSavedData();
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
        <p>{issue.message}</p>
      </details>
    </dialog>
  );
};

export const SaveRecoveryBoundary = ({ children }: { children: ReactNode }) => {
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
        <Footer />
      </div>
      <SaveRecoveryDialog
        key={issue.kind}
        issue={issue}
        onRetry={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};
