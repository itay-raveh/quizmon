import { Dialog } from '@base-ui/react/dialog';
import { Field } from '@base-ui/react/field';
import { Form } from '@base-ui/react/form';
import { Disclosure } from '@/components/Disclosure';
import { Input } from '@base-ui/react/input';
import { Button } from '@base-ui/react/button';
import { ModalDialog } from '@/components/ModalDialog';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { OTPField } from '@base-ui/react/otp-field';
import { z } from 'zod';
import { GameButton } from '../../components/GameButton';
import { FeedbackButton } from '../../app/FeedbackButton';
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
    .regex(/^\d+$/, 'Use digits only.'),
});

const DeleteAccountDialog = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <ModalDialog onClose={onCancel} className="confirm-dialog">
      <div className="confirm-dialog__body">
        <Dialog.Title>Delete your account?</Dialog.Title>
        <Dialog.Description>
          Your account and synced progress will be deleted. This cannot be
          undone. Other devices may retain local copies.
        </Dialog.Description>
        <div className="confirm-dialog__actions">
          <Dialog.Close render={<GameButton tone="quiet" />}>
            Keep account
          </Dialog.Close>
          <GameButton className="confirm-dialog__confirm" onClick={onConfirm}>
            Delete account
          </GameButton>
        </div>
      </div>
    </ModalDialog>
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
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const codeInput = useRef<HTMLInputElement>(null);
  const emailValidation = emailSchema.safeParse({ email });
  const codeValidation = codeSchema.safeParse({ code });
  useEffect(() => {
    if (sent && !busy) codeInput.current?.focus();
  }, [sent, busy]);

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
    setCode('');
    setMessage(resend ? 'New code sent. Check your inbox.' : '');
  };
  const showSignIn = recoverySignIn || !account.owner || reauthenticating;
  const syncNeedsSignIn = account.recoveryReason === 'sign-in';
  const syncPaused = !!account.error;
  const syncOffline = account.offline;

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
          {recoverySignIn || account.owner ? (
            <p>Sign in to the same account to resume syncing.</p>
          ) : !sent ? (
            <ul className="account-settings__benefits">
              <li>
                <ArrowsClockwiseIcon aria-hidden="true" weight="bold" /> Sync
                between devices
              </li>
              <li>
                <MedalIcon aria-hidden="true" weight="bold" /> Compete with the
                world
              </li>
              <li>
                <UsersIcon aria-hidden="true" weight="bold" /> Connect with
                friends
              </li>
            </ul>
          ) : null}
          <Form
            className={`account-settings__section${sent ? ' account-settings__verification' : ''}`}
            aria-label="Sign in"
            noValidate
            validationMode="onChange"
            errors={sent && error ? { code: error } : undefined}
            onFormSubmit={(values: Record<string, unknown>) => {
              if (sent) {
                const parsed = codeSchema.safeParse({ code: values.code });
                if (!parsed.success) return;
                run(async () => {
                  await verifySignInCode(email.trim(), parsed.data.code);
                  if (recoverySignIn)
                    setMessage('Signed in. Choose the account backup again.');
                }, true);
              } else {
                const parsed = emailSchema.safeParse({ email: values.email });
                if (parsed.success) run(() => send(parsed.data.email));
              }
            }}
          >
            {sent ? (
              <>
                <div className="account-settings__verify-intro">
                  <h2>Check your inbox</h2>
                  <p>We sent a six-digit code to</p>
                  <div className="account-settings__destination">
                    <strong>{email.trim()}</strong>
                    <Button
                      className="account-settings__text-action"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setSent(false);
                        setCode('');
                        setMessage('');
                        setError('');
                      }}
                    >
                      Change email
                    </Button>
                  </div>
                </div>
                <Field.Root
                  name="code"
                  className="account-settings__code-field"
                  disabled={busy}
                  validate={(value) =>
                    codeSchema.safeParse({ code: value }).error?.issues[0]
                      ?.message
                  }
                >
                  <Field.Label>Six-digit code</Field.Label>
                  <OTPField.Root
                    value={code}
                    length={6}
                    className="account-settings__code-slots"
                    onValueChange={(value) => {
                      setCode(value);
                      if (error) setError('');
                    }}
                  >
                    {Array.from({ length: 6 }, (_, index) => (
                      <OTPField.Input
                        key={index}
                        ref={index === 0 ? codeInput : undefined}
                        className="account-settings__code-slot"
                        aria-label={
                          index ? `Digit ${index + 1} of 6` : undefined
                        }
                      />
                    ))}
                  </OTPField.Root>
                  <Field.Error
                    className="account-settings__error"
                    role="alert"
                  />
                  <Field.Description className="account-settings__code-hint">
                    Code expires in five minutes.
                  </Field.Description>
                </Field.Root>
              </>
            ) : (
              <Field.Root
                name="email"
                className="account-settings__field"
                disabled={busy}
                validate={(value) =>
                  emailSchema.safeParse({ email: value }).error?.issues[0]
                    ?.message
                }
              >
                <Field.Label>Email</Field.Label>
                <Input
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onValueChange={setEmail}
                />
                <Field.Error className="account-settings__error" role="alert" />
              </Field.Root>
            )}
            {!sent && (
              <p>
                By continuing, you agree to our{' '}
                <a href="/terms">Terms of Use</a>. See our{' '}
                <a href="/privacy">Privacy and Cookies policy</a> for how we
                handle your data.
              </p>
            )}
            <div className="account-settings__actions">
              <GameButton
                type="submit"
                className={sent ? 'account-settings__verify-button' : ''}
                disabled={
                  busy ||
                  !(sent ? codeValidation.success : emailValidation.success)
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
                <Button
                  className="account-settings__text-action"
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => send(email.trim(), true))}
                >
                  {busy && !preparingAccount ? 'Sending…' : 'Resend code'}
                </Button>
                {message && <span role="status">{message}</span>}
              </div>
            )}
          </Form>
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
          <div className="account-settings__primary-action">
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
            className="account-settings__section"
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
              className="account-settings__sync"
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
                <div className="account-settings__actions">
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
            <Disclosure
              className="account-settings__details"
              label={<> Recover device changes </>}
            >
              <BackupSettings accountRecovery />
            </Disclosure>
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
      {error && !sent && (
        <p className="settings-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
