import { useEffect, useState, useSyncExternalStore } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { GameButton } from '../../components/GameButton';
import { ArrowsClockwiseIcon, CheckIcon, XIcon } from '../../components/icons';
import { isRecord } from '../../lib/validation';
import { downloadAccountExport } from './account-export';
import {
  accountRequest,
  loadAccountConfig,
  accountSnapshot,
  continueSignIn,
  finishSignIn,
  retryAccountSync,
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
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  useEffect(() => {
    if (!account.owner) void loadAccountConfig();
  }, [account.owner]);
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
  const syncNeedsSignIn = /^(Sign in|Account changed)/.test(account.error);
  const syncPaused = !!account.error;
  const syncOffline = account.status.includes('Will sync when connected');
  const syncNeedsReview = account.issues.length > 0;
  const syncComplete = account.status === 'Synced' && !syncPaused;
  const syncWorking =
    !syncPaused && !syncOffline && !syncNeedsReview && !syncComplete;

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
            <p>Sync your progress and join the rankings.</p>
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
            className={`account-settings__section account-settings__sync${syncPaused ? ' account-settings__sync--paused' : ''}`}
            aria-labelledby="account-sync-title"
          >
            <div className="account-settings__sync-heading" role="status">
              <span
                className={`account-settings__sync-icon${syncWorking ? ' account-settings__sync-icon--working' : ''}`}
                aria-hidden="true"
              >
                {syncComplete ? (
                  <CheckIcon weight="bold" />
                ) : syncPaused ? (
                  <XIcon weight="bold" />
                ) : (
                  <ArrowsClockwiseIcon weight="bold" />
                )}
              </span>
              <div>
                <h2 id="account-sync-title">
                  {syncPaused
                    ? 'Sync paused'
                    : syncOffline
                      ? 'Waiting for connection'
                      : syncNeedsReview
                        ? 'Review changes'
                        : syncComplete
                          ? 'Progress synced'
                          : 'Syncing progress'}
                </h2>
                {(syncPaused || syncOffline || syncNeedsReview) && (
                  <p>
                    {syncPaused
                      ? syncNeedsSignIn
                        ? 'Sign in again to continue.'
                        : 'Saved on this device. Try reconnecting.'
                      : syncNeedsReview
                        ? 'Choose how to resolve the changes below.'
                        : 'Saved on this device. Sync will resume online.'}
                  </p>
                )}
              </div>
            </div>
            {syncWorking && (
              <div
                className="account-settings__sync-track"
                role="progressbar"
                aria-label="Syncing progress"
              />
            )}
            {account.pending > 0 && (
              <p className="account-settings__pending">
                <strong>{account.pending}</strong>{' '}
                {account.pending === 1 ? 'change' : 'changes'} waiting
              </p>
            )}
            {syncPaused && (
              <div className="account-settings__sync-recovery">
                <GameButton
                  disabled={busy}
                  onClick={() =>
                    syncNeedsSignIn
                      ? setReauthenticating(true)
                      : run(retryAccountSync)
                  }
                >
                  {syncNeedsSignIn
                    ? 'Sign in again'
                    : busy
                      ? 'Reconnecting…'
                      : 'Retry sync'}
                </GameButton>
              </div>
            )}
          </section>
          {account.issues.length > 0 && (
            <AccountConflicts
              issues={account.issues}
              resolve={resolveAccountIssue}
              disabled={busy}
            />
          )}
          <details className="account-settings__options">
            <summary>Account options</summary>
            <div className="account-settings__option-actions">
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await downloadAccountExport();
                    setMessage('Account data downloaded.');
                  })
                }
              >
                Download account data
              </GameButton>
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() => run(signOutAccount)}
              >
                Sign out
              </GameButton>
              <p>Signing out returns to your separate guest save.</p>
            </div>
          </details>
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
