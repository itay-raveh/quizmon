import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { GameButton } from '../../components/GameButton';
import { isRecord } from '../../lib/validation';
import { downloadAccountExport } from './account-export';
import {
  accountRequest,
  loadAccountConfig,
  accountSnapshot,
  continueSignIn,
  finishSignIn,
  resolveAccountIssue,
  sendSignInCode,
  signOutAccount,
  subscribeAccount,
  verifySignInCode,
} from './account';
import { AccountConflicts } from './AccountConflicts';
import './account.css';

export const AccountSettings = () => {
  useEffect(() => {
    void loadAccountConfig();
  }, []);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparingAccount, setPreparingAccount] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sent) codeInput.current?.focus();
  }, [sent]);

  const run = (work: () => Promise<void>, signIn = false) => {
    if (busy) return;
    setBusy(true);
    setPreparingAccount(signIn);
    setError('');
    setMessage('');
    void work()
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'Please try again.');
      })
      .finally(() => setBusy(false));
  };
  const send = async () => {
    await sendSignInCode(email.trim());
    setSent(true);
    setCode('');
    setMessage('Code requested. Expires in five minutes.');
  };
  const showSignIn = !account.owner || reauthenticating;

  return (
    <div className="account-settings">
      {account.mergeRequired ? (
        <section
          className="account-settings__section"
          aria-labelledby="account-progress-title"
        >
          <h2 id="account-progress-title">Bring your progress with you</h2>
          <p>
            This browser and your account both have progress. Add this browser’s
            completed progress, or keep the guest save separate and use your
            account progress.
          </p>
          <div className="account-settings__actions">
            <GameButton
              disabled={busy}
              onClick={() => run(() => finishSignIn(true), true)}
            >
              Add browser progress
            </GameButton>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => run(() => finishSignIn(false, true), true)}
            >
              Use account progress
            </GameButton>
          </div>
        </section>
      ) : showSignIn ? (
        <>
          {account.owner ? (
            <p>Sign in to the same account to resume syncing.</p>
          ) : !sent ? (
            <p>Sync your progress and join Daily leaderboards.</p>
          ) : null}
          <form
            className="account-settings__section"
            aria-label="Sign in"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                sent ? () => verifySignInCode(email.trim(), code) : send,
                sent,
              );
            }}
          >
            {sent ? (
              <>
                <h2>Check your email</h2>
                <p>
                  Enter the six-digit code for <strong>{email.trim()}</strong>.
                </p>
                <label className="account-settings__field">
                  Sign-in code
                  <input
                    ref={codeInput}
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    disabled={busy}
                    onChange={(event) => setCode(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="account-settings__field">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  required
                  value={email}
                  disabled={busy}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            )}
            <div className="account-settings__actions">
              <GameButton
                type="submit"
                disabled={
                  busy || !email.trim() || (sent && !/^\d{6}$/.test(code))
                }
              >
                {sent ? 'Sign in' : 'Send sign-in code'}
              </GameButton>
              {sent && (
                <>
                  <GameButton
                    tone="quiet"
                    disabled={busy}
                    onClick={() => run(send)}
                  >
                    Resend code
                  </GameButton>
                  <GameButton
                    tone="quiet"
                    disabled={busy}
                    onClick={() => {
                      setSent(false);
                      setCode('');
                      setMessage('');
                      setError('');
                    }}
                  >
                    Change email
                  </GameButton>
                </>
              )}
              {reauthenticating && (
                <GameButton
                  tone="quiet"
                  disabled={busy}
                  onClick={() => {
                    setReauthenticating(false);
                    setSent(false);
                    setError('');
                    setMessage('');
                  }}
                >
                  Cancel
                </GameButton>
              )}
            </div>
            {!account.owner && !sent && (
              <p className="account-settings__privacy">
                Your Trainer name, partner and Daily scores are public.
              </p>
            )}
          </form>
          {account.emailDelivery === 'test-mailbox' && (
            <aside
              className="account-settings__testing"
              aria-label="Local testing"
            >
              <p>Local testing: use an @example.test address.</p>
              {sent && (
                <GameButton
                  tone="quiet"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      const mail = await accountRequest(
                        `/api/dev/mailbox?email=${encodeURIComponent(email.trim())}`,
                      );
                      if (!isRecord(mail) || typeof mail.code !== 'string')
                        throw new Error('No recent code. Request a new one.');
                      setCode(mail.code);
                      codeInput.current?.focus();
                    })
                  }
                >
                  Read local test mailbox
                </GameButton>
              )}
            </aside>
          )}
          {sent && error && (
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => run(continueSignIn, true)}
            >
              Continue sign-in
            </GameButton>
          )}
        </>
      ) : (
        <>
          <section
            className="account-settings__section"
            aria-labelledby="account-sync-title"
          >
            <h2 id="account-sync-title">Your progress</h2>
            <p role="status">{account.status}</p>
            <p>
              Completed progress is shared across your devices. Unfinished
              rounds stay here.
            </p>
            {account.pending > 0 && (
              <p>
                {account.pending} {account.pending === 1 ? 'change' : 'changes'}{' '}
                waiting to sync.
              </p>
            )}
            {account.error && (
              <>
                <p className="settings-error" role="alert">
                  {account.error}
                </p>
                <GameButton
                  tone="quiet"
                  onClick={() => setReauthenticating(true)}
                >
                  Sign in again
                </GameButton>
              </>
            )}
          </section>
          {account.issues.length > 0 && (
            <AccountConflicts
              issues={account.issues}
              resolve={resolveAccountIssue}
              disabled={busy}
            />
          )}
          <section
            className="account-settings__section"
            aria-labelledby="account-export-title"
          >
            <h2 id="account-export-title">Account data</h2>
            <p>
              Download the data saved to your account. Changes waiting to sync
              are included in this device’s browser backup.
            </p>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await downloadAccountExport();
                  setMessage(
                    'Account export received. Check your browser downloads for the file.',
                  );
                })
              }
            >
              Export account data
            </GameButton>
          </section>
          <section
            className="account-settings__section"
            aria-labelledby="account-sign-out-title"
          >
            <h2 id="account-sign-out-title">Sign out on this device</h2>
            <p>
              You’ll return to your separate guest save. This account’s
              downloaded progress and pending changes stay on this device.
            </p>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => run(signOutAccount)}
            >
              Sign out
            </GameButton>
          </section>
        </>
      )}
      {busy && (
        <p role="status">
          {preparingAccount
            ? 'Preparing your account progress…'
            : 'Please wait…'}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
