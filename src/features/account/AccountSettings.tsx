import * as styles from '../../styles/classes.css.ts';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { GameButton } from '../../components/GameButton';
import { FeedbackButton } from '../../app/FeedbackButton';
import { useModalDialog } from '../../hooks/useModalDialog';
import {
  ArrowsClockwiseIcon,
  MedalIcon,
  UsersIcon,
} from '../../components/icons';
import { isRecord } from '../../lib/validation';
import {
  accountRequest,
  AccountNotice,
  loadAccountConfig,
  accountSnapshot,
  continueSignIn,
  deleteAccount,
  finishSignIn,
  retryAccountSync,
  sendSignInCode,
  signOutAccount,
  subscribeAccount,
  verifySignInCode,
} from './account';
import { downloadAccountExport } from './account-export';
import { BackupSettings } from '../settings/BackupSettings';

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

const DeleteAccountDialog = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { dialog, dialogProps, closeDialog } = useModalDialog(onCancel);

  return (
    <dialog
      {...dialogProps}
      aria-describedby="delete-account-description"
      aria-labelledby="delete-account-title"
      className={styles.confirmDialog}
    >
      <div className={styles.confirmDialogBody}>
        <h2 id="delete-account-title">Delete your account?</h2>
        <p id="delete-account-description">
          Your account and synced progress will be deleted. This cannot be
          undone. Other devices may retain local copies.
        </p>
        <div className={styles.confirmDialogActions}>
          <GameButton autoFocus tone="quiet" onClick={closeDialog}>
            Keep account
          </GameButton>
          <GameButton
            className={styles.confirmDialogConfirm}
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            Delete account
          </GameButton>
        </div>
      </div>
    </dialog>
  );
};

export const AccountSettings = ({
  recoverySignIn = false,
}: {
  recoverySignIn?: boolean;
}) => {
  const account = useSyncExternalStore(subscribeAccount, accountSnapshot);
  useEffect(() => {
    if (!account.owner) void loadAccountConfig();
  }, [account.owner]);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preparingAccount, setPreparingAccount] = useState(false);
  const [reauthenticating, setReauthenticating] = useState(false);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
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
        setError(
          cause instanceof AccountNotice
            ? cause.message
            : 'Please try again or report the issue.',
        );
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
  const showSignIn = recoverySignIn || !account.owner || reauthenticating;
  const codeError = codeForm.formState.errors.code?.message || (sent && error);
  const syncNeedsSignIn = account.recoveryReason === 'sign-in';
  const syncPaused = !!account.error;
  const syncOffline = account.offline;

  return (
    <div className={styles.accountSettings}>
      {account.mergeRequired ? (
        <section
          className={styles.accountSettingsSection}
          aria-labelledby="account-progress-title"
        >
          <h2 id="account-progress-title">Bring your progress with you</h2>
          <p>
            This browser and your account both have progress. Add this browser’s
            completed progress, or keep the guest save separate and use your
            account progress.
          </p>
          <div className={styles.accountSettingsActions}>
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
          {recoverySignIn || account.owner ? (
            <p>Sign in to the same account to resume syncing.</p>
          ) : !sent ? (
            <ul className={styles.accountSettingsBenefits}>
              <li>
                <ArrowsClockwiseIcon aria-hidden="true" /> Sync between devices
              </li>
              <li>
                <MedalIcon aria-hidden="true" /> Compete with the world
              </li>
              <li>
                <UsersIcon aria-hidden="true" /> Connect with friends
              </li>
            </ul>
          ) : null}
          <form
            className={`${styles.accountSettingsSection}${sent ? ` ${styles.accountSettingsVerification}` : ''}`}
            aria-label="Sign in"
            noValidate
            onSubmit={(event) => {
              void (
                sent
                  ? codeForm.handleSubmit(({ code }) =>
                      run(async () => {
                        await verifySignInCode(
                          emailForm.getValues('email').trim(),
                          code,
                        );
                        if (recoverySignIn)
                          setMessage(
                            'Signed in. Choose the account backup again.',
                          );
                      }, true),
                    )
                  : emailForm.handleSubmit(({ email }) =>
                      run(() => send(email)),
                    )
              )(event);
            }}
          >
            {sent ? (
              <>
                <div className={styles.accountSettingsVerifyIntro}>
                  <h2>Check your inbox</h2>
                  <p>We sent a six-digit code to</p>
                  <div className={styles.accountSettingsDestination}>
                    <strong>{emailForm.getValues('email').trim()}</strong>
                    <button
                      className={styles.accountSettingsTextAction}
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
                <div className={styles.accountSettingsCodeField}>
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
                        containerClassName={styles.accountSettingsOtp}
                        className={styles.accountSettingsOtpInput}
                        onChange={(value) => {
                          field.onChange(value);
                          if (error) setError('');
                        }}
                        render={({ slots }) => (
                          <div
                            className={styles.accountSettingsCodeSlots}
                            aria-hidden="true"
                          >
                            {slots.map((slot, index) => (
                              <span
                                className={`${styles.accountSettingsCodeSlot}${slot.isActive ? ` ${styles.accountSettingsCodeSlotActive}` : ''}`}
                                key={index}
                              >
                                {slot.char}
                                {slot.hasFakeCaret && (
                                  <span
                                    className={styles.accountSettingsCodeCaret}
                                  />
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
                      className={styles.accountSettingsError}
                      role="alert"
                    >
                      {codeError}
                    </span>
                  ) : (
                    <span
                      id="sign-in-code-hint"
                      className={styles.accountSettingsCodeHint}
                    >
                      Code expires in five minutes.
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.accountSettingsField}>
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
                    className={styles.accountSettingsError}
                    role="alert"
                  >
                    {emailForm.formState.errors.email.message}
                  </span>
                )}
              </div>
            )}
            {!sent && (
              <p>
                By continuing, you agree to our{' '}
                <a href="/terms">Terms of Use</a>. See our{' '}
                <a href="/privacy">Privacy and Cookies policy</a> for how we
                handle your data.
              </p>
            )}
            <div className={styles.accountSettingsActions}>
              <GameButton
                type="submit"
                className={sent ? styles.accountSettingsVerifyButton : ''}
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
              <div className={styles.accountSettingsResend}>
                <span>Didn’t get the code?</span>
                <button
                  className={styles.accountSettingsTextAction}
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
              className={styles.accountSettingsTesting}
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
          <div className={styles.accountSettingsPrimaryAction}>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => run(signOutAccount)}
            >
              Sign out
            </GameButton>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => run(downloadAccountExport)}
            >
              Download account archive
            </GameButton>
          </div>
          <section
            className={styles.accountSettingsSection}
            aria-label="Delete account"
          >
            <p>
              Delete your account and synced progress. This also removes the
              account save from this device.
            </p>
            <GameButton
              tone="quiet"
              disabled={busy}
              onClick={() => setDeleteConfirmationOpen(true)}
            >
              Delete account
            </GameButton>
            {deleteConfirmationOpen && (
              <DeleteAccountDialog
                onCancel={() => setDeleteConfirmationOpen(false)}
                onConfirm={() => {
                  setDeleteConfirmationOpen(false);
                  run(deleteAccount);
                }}
              />
            )}
            {error === 'Sign in again to delete your account.' && (
              <GameButton
                tone="quiet"
                disabled={busy}
                onClick={() => setReauthenticating(true)}
              >
                Sign in again
              </GameButton>
            )}
          </section>
          {(syncPaused || syncOffline) && (
            <section
              className={styles.accountSettingsSync}
              aria-label="Sync status"
              role="status"
            >
              <strong>
                {syncPaused ? 'Sync needs attention' : 'Waiting for connection'}
              </strong>
              <p>
                {syncNeedsSignIn
                  ? 'Sign in again to continue.'
                  : syncOffline
                    ? 'Changes will sync when you reconnect.'
                    : 'Your changes are saved on this device.'}
              </p>
              {syncPaused && (
                <div className={styles.accountSettingsActions}>
                  <GameButton
                    tone="quiet"
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
                        : 'Try again'}
                  </GameButton>
                  <FeedbackButton showLabel />
                </div>
              )}
            </section>
          )}
          {(syncPaused || syncOffline) && (
            <details className={styles.accountSettingsDetails}>
              <summary>Recover device changes</summary>
              <BackupSettings accountRecovery />
            </details>
          )}
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
      {error && !sent && <p role="alert">{error}</p>}
    </div>
  );
};
