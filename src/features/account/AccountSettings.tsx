import { useEffect, useState, useSyncExternalStore } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
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

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .pipe(z.email('Enter a valid email address.')),
});
const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit code.'),
});

export const AccountSettings = () => {
  useEffect(() => {
    void loadAccountConfig();
  }, []);
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparingAccount, setPreparingAccount] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const emailForm = useForm<z.input<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });
  const codeForm = useForm<z.input<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    mode: 'onChange',
    defaultValues: { code: '' },
  });
  const focusCode = codeForm.setFocus;

  useEffect(() => {
    if (sent) focusCode('code');
  }, [sent, focusCode]);

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
  const send = async (email: string) => {
    await sendSignInCode(email);
    setSent(true);
    codeForm.reset();
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
            <ul className="account-settings__benefits">
              <li>Sync between devices</li>
              <li>Compete with the world</li>
              <li>Connect with friends</li>
            </ul>
          ) : null}
          <form
            className="account-settings__section"
            aria-label="Sign in"
            noValidate
            onSubmit={(event) => {
              void (
                sent
                  ? codeForm.handleSubmit(({ code }) =>
                      run(
                        () =>
                          verifySignInCode(
                            emailForm.getValues('email').trim(),
                            code,
                          ),
                        true,
                      ),
                    )
                  : emailForm.handleSubmit(({ email }) =>
                      run(() => send(email)),
                    )
              )(event);
            }}
          >
            {sent ? (
              <>
                <h2>Check your email</h2>
                <p>
                  Enter the six-digit code for{' '}
                  <strong>{emailForm.getValues('email').trim()}</strong>.
                </p>
                <div className="account-settings__field">
                  <label htmlFor="sign-in-code">Sign-in code</label>
                  <input
                    id="sign-in-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    disabled={busy}
                    aria-invalid={!!codeForm.formState.errors.code}
                    aria-describedby={
                      codeForm.formState.errors.code
                        ? 'sign-in-code-error'
                        : undefined
                    }
                    {...codeForm.register('code')}
                  />
                  {codeForm.formState.errors.code && (
                    <span
                      id="sign-in-code-error"
                      className="account-settings__error"
                      role="alert"
                    >
                      {codeForm.formState.errors.code.message}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="account-settings__field">
                <label htmlFor="sign-in-email">Email</label>
                <input
                  id="sign-in-email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  disabled={busy}
                  aria-invalid={!!emailForm.formState.errors.email}
                  aria-describedby={
                    emailForm.formState.errors.email
                      ? 'sign-in-email-error'
                      : undefined
                  }
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email && (
                  <span
                    id="sign-in-email-error"
                    className="account-settings__error"
                    role="alert"
                  >
                    {emailForm.formState.errors.email.message}
                  </span>
                )}
              </div>
            )}
            <div className="account-settings__actions">
              <GameButton
                type="submit"
                disabled={
                  busy ||
                  !(sent
                    ? codeForm.formState.isValid
                    : emailForm.formState.isValid)
                }
              >
                {sent ? 'Sign in' : 'Send sign-in code'}
              </GameButton>
              {sent && (
                <>
                  <GameButton
                    tone="quiet"
                    disabled={busy}
                    onClick={() =>
                      run(() => send(emailForm.getValues('email').trim()))
                    }
                  >
                    Resend code
                  </GameButton>
                  <GameButton
                    tone="quiet"
                    disabled={busy}
                    onClick={() => {
                      setSent(false);
                      codeForm.reset();
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
                        `/api/dev/mailbox?email=${encodeURIComponent(emailForm.getValues('email').trim())}`,
                      );
                      if (!isRecord(mail) || typeof mail.code !== 'string')
                        throw new Error('No recent code. Request a new one.');
                      codeForm.setValue('code', mail.code, {
                        shouldValidate: true,
                      });
                      codeForm.setFocus('code');
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
