import { useEffect, useState, useSyncExternalStore } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
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
  code: z
    .string()
    .length(6, 'Enter the six-digit code.')
    .regex(new RegExp(REGEXP_ONLY_DIGITS), 'Use digits only.'),
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
  const send = async (email: string, resend = false) => {
    await sendSignInCode(email);
    setSent(true);
    codeForm.reset();
    setMessage(resend ? 'New code sent. Check your inbox.' : '');
    if (resend) focusCode('code');
  };
  const showSignIn = !account.owner || reauthenticating;
  const codeError = codeForm.formState.errors.code?.message || (sent && error);

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
            className={`account-settings__section${sent ? ' account-settings__verification' : ''}`}
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
                <div className="account-settings__verify-intro">
                  <h2>Check your inbox</h2>
                  <p>We sent a six-digit code to</p>
                  <div className="account-settings__destination">
                    <strong>{emailForm.getValues('email').trim()}</strong>
                    <button
                      className="account-settings__text-action"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setSent(false);
                        codeForm.reset();
                        setMessage('');
                        setError('');
                      }}
                    >
                      Change email
                    </button>
                  </div>
                </div>
                <div className="account-settings__code-field">
                  <label htmlFor="sign-in-code">Six-digit code</label>
                  <Controller
                    name="code"
                    control={codeForm.control}
                    render={({ field }) => (
                      <OTPInput
                        {...field}
                        id="sign-in-code"
                        maxLength={6}
                        pattern={REGEXP_ONLY_DIGITS}
                        inputMode="numeric"
                        disabled={busy}
                        aria-invalid={!!codeError}
                        aria-describedby={
                          codeError ? 'sign-in-code-error' : 'sign-in-code-hint'
                        }
                        containerClassName="account-settings__otp"
                        className="account-settings__otp-input"
                        onChange={(value) => {
                          field.onChange(value);
                          if (error) setError('');
                        }}
                        render={({ slots }) => (
                          <div
                            className="account-settings__code-slots"
                            aria-hidden="true"
                          >
                            {slots.map((slot, index) => (
                              <span
                                className={`account-settings__code-slot${slot.isActive ? ' account-settings__code-slot--active' : ''}`}
                                key={index}
                              >
                                {slot.char}
                                {slot.hasFakeCaret && (
                                  <span className="account-settings__code-caret" />
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      />
                    )}
                  />
                  {codeError ? (
                    <span
                      id="sign-in-code-error"
                      className="account-settings__error"
                      role="alert"
                    >
                      {codeError}
                    </span>
                  ) : (
                    <span
                      id="sign-in-code-hint"
                      className="account-settings__code-hint"
                    >
                      Code expires in five minutes.
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
                className={sent ? 'account-settings__verify-button' : ''}
                disabled={
                  busy ||
                  !(sent
                    ? codeForm.formState.isValid
                    : emailForm.formState.isValid)
                }
              >
                {sent
                  ? busy && preparingAccount
                    ? 'Verifying…'
                    : 'Verify and sign in'
                  : busy
                    ? 'Sending…'
                    : 'Send sign-in code'}
              </GameButton>
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
            {sent && (
              <div className="account-settings__resend">
                <span>Didn’t get the code?</span>
                <button
                  className="account-settings__text-action"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(() => send(emailForm.getValues('email').trim(), true))
                  }
                >
                  {busy && !preparingAccount ? 'Sending…' : 'Resend code'}
                </button>
                {message && <span role="status">{message}</span>}
              </div>
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
      {busy && !showSignIn && (
        <p role="status">
          {preparingAccount
            ? 'Preparing your account progress…'
            : 'Please wait…'}
        </p>
      )}
      {message && !sent && <p role="status">{message}</p>}
      {error && !sent && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
