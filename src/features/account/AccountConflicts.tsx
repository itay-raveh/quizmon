import { useEffect, useRef, useState } from 'react';
import { GameButton } from '../../components/GameButton';
import type { AccountIssue } from '../../lib/storage/account-issues';

export function AccountConflicts({
  issues,
  resolve,
  disabled,
}: {
  issues: AccountIssue[];
  resolve: (issue: AccountIssue, reapply: boolean) => Promise<void>;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) status.current?.focus();
  }, [message]);
  const choose = async (issue: AccountIssue, reapply: boolean) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await resolve(issue, reapply);
      setMessage(
        reapply
          ? 'Your edit is saved on this device.'
          : 'Your choice is saved on this device.',
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Your choice could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="account-conflicts" aria-label="Sync review">
      {issues.length > 0 && <h3>Review changes</h3>}
      <p ref={status} tabIndex={-1} role="status" hidden={!message}>
        {message}
      </p>
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
      {issues.map((issue) => (
        <fieldset key={issue.operationId} className="experience-setting">
          <legend>Unsynced change</legend>
          <p>
            {issue.reason === 'needs_review'
              ? 'This saved edit needs review. You can apply it again to your account.'
              : issue.reason === 'specialty_not_earned'
                ? 'This Trainer title has not been earned on your account. Your accepted title is kept.'
                : issue.reason === 'too_large'
                  ? 'This saved change is too large to sync. Download a backup before dismissing it.'
                  : 'This change could not be accepted. Your backup includes the affected change.'}
          </p>
          <div className="backup-settings__actions">
            <GameButton
              tone="quiet"
              disabled={disabled || busy}
              onClick={() => void choose(issue, false)}
            >
              Dismiss
            </GameButton>
            {issue.reapplicable && (
              <GameButton
                tone="quiet"
                disabled={disabled || busy}
                onClick={() => void choose(issue, true)}
              >
                Apply this edit
              </GameButton>
            )}
          </div>
        </fieldset>
      ))}
    </section>
  );
}
