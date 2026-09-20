import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettings } from './AccountSettings';

// jsdom does not implement hit testing used by input-otp's focus handling.
Object.defineProperty(document, 'elementFromPoint', { value: () => null });

const account = vi.hoisted(() => {
  const snapshot = {
    owner: '',
    status: 'Saved on this device',
    error: '',
    pending: 0,
    mergeRequired: false,
    emailDelivery: '',
    issues: [],
  };
  return {
    snapshot,
    listeners: new Set<() => void>(),
    send: vi.fn(),
    verify: vi.fn(),
    finish: vi.fn(),
    continue: vi.fn(),
    signOut: vi.fn(),
  };
});

vi.mock('./account', () => ({
  accountSnapshot: () => account.snapshot,
  subscribeAccount: (listener: () => void) => {
    account.listeners.add(listener);
    return () => account.listeners.delete(listener);
  },
  loadAccountConfig: vi.fn(),
  accountRequest: vi.fn(),
  sendSignInCode: account.send,
  verifySignInCode: account.verify,
  finishSignIn: account.finish,
  continueSignIn: account.continue,
  signOutAccount: account.signOut,
  resolveAccountIssue: vi.fn(),
}));
vi.mock('./account-export', () => ({ downloadAccountExport: vi.fn() }));

beforeEach(() => {
  account.snapshot = {
    owner: '',
    status: 'Saved on this device',
    error: '',
    pending: 0,
    mergeRequired: false,
    emailDelivery: '',
    issues: [],
  };
  account.listeners.clear();
  vi.resetAllMocks();
  account.send.mockResolvedValue(undefined);
  account.verify.mockResolvedValue(undefined);
  account.finish.mockResolvedValue(undefined);
});

it('submits email and a six-digit code with Enter in separate steps', async () => {
  const user = userEvent.setup();
  render(<AccountSettings />);
  expect(screen.getByText('Sync between devices')).toBeVisible();
  expect(screen.getByText('Compete with the world')).toBeVisible();
  expect(screen.getByText('Connect with friends')).toBeVisible();
  expect(screen.queryByText(/Daily scores are public/)).not.toBeInTheDocument();
  await user.type(
    screen.getByLabelText('Email', { exact: true }),
    'trainer@example.test{Enter}',
  );
  await waitFor(() =>
    expect(account.send).toHaveBeenCalledExactlyOnceWith(
      'trainer@example.test',
    ),
  );
  const code = await screen.findByLabelText('Six-digit code');
  expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  expect(code).toHaveFocus();
  expect(
    document.querySelectorAll('.account-settings__code-slot'),
  ).toHaveLength(6);
  expect(screen.getByText('Code expires in five minutes.')).toBeVisible();
  expect(screen.queryByText(/Code requested/)).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText('Email', { exact: true }),
  ).not.toBeInTheDocument();
  await user.type(code, '012345{Enter}');
  await waitFor(() =>
    expect(account.verify).toHaveBeenCalledExactlyOnceWith(
      'trainer@example.test',
      '012345',
    ),
  );
});

it('shows a rejected code beside the six slots and allows a new code', async () => {
  const user = userEvent.setup();
  account.verify.mockRejectedValueOnce(
    new Error('Code expired. Request another.'),
  );
  render(<AccountSettings />);
  await user.type(
    screen.getByLabelText('Email'),
    'trainer@example.test{Enter}',
  );
  const code = await screen.findByLabelText('Six-digit code');
  await user.type(code, '012345{Enter}');
  expect(
    await screen.findByText('Code expired. Request another.'),
  ).toBeVisible();
  expect(code).toHaveAccessibleDescription('Code expired. Request another.');
  await user.click(screen.getByRole('button', { name: 'Resend code' }));
  expect(
    await screen.findByText('New code sent. Check your inbox.'),
  ).toBeVisible();
  expect(code).toHaveValue('');
});

it('shows an inline email error and clears it when the address becomes valid', async () => {
  const user = userEvent.setup();
  render(<AccountSettings />);
  const email = screen.getByLabelText('Email');
  await user.type(email, 'invalid');
  expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(email).toHaveAccessibleDescription('Enter a valid email address.');
  expect(account.send).not.toHaveBeenCalled();
  await user.type(email, '@example.test');
  await waitFor(() =>
    expect(
      screen.queryByText('Enter a valid email address.'),
    ).not.toBeInTheDocument(),
  );
  expect(email).toHaveAttribute('aria-invalid', 'false');
  expect(
    screen.getByRole('button', { name: 'Send sign-in code' }),
  ).toBeEnabled();
});

it('shows account management without sign-in controls', () => {
  account.snapshot = {
    ...account.snapshot,
    owner: 'existing',
    status: 'Synced',
  };
  render(<AccountSettings />);
  expect(screen.getByText('Synced')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Export account data' }),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
  expect(
    screen.queryByRole('form', { name: 'Sign in' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText('Email', { exact: true }),
  ).not.toBeInTheDocument();
});

it('allows reauthentication only after explicitly opening it from a sync error', async () => {
  account.snapshot = {
    ...account.snapshot,
    owner: 'existing',
    error: 'Sign in to the same account to resume syncing.',
  };
  render(<AccountSettings />);
  expect(
    screen.queryByLabelText('Email', { exact: true }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Sign in again' }));
  expect(screen.getByLabelText('Email', { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(
    screen.queryByLabelText('Email', { exact: true }),
  ).not.toBeInTheDocument();
});

it.each([
  ['Add browser progress', true, undefined],
  ['Use account progress', false, true],
] as const)('preserves the %s merge choice', async (name, merge, only) => {
  account.snapshot = { ...account.snapshot, mergeRequired: true };
  render(<AccountSettings />);
  expect(screen.queryByRole('form')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name }));
  if (only) expect(account.finish).toHaveBeenCalledExactlyOnceWith(merge, only);
  else expect(account.finish).toHaveBeenCalledExactlyOnceWith(merge);
});

it('keeps a failed merge choice available for retry', async () => {
  account.snapshot = { ...account.snapshot, mergeRequired: true };
  account.finish.mockRejectedValue(
    new Error('Finish the unfinished guest round first.'),
  );
  render(<AccountSettings />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Add browser progress' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Finish the unfinished guest round first.',
  );
  expect(
    screen.getByRole('button', { name: 'Use account progress' }),
  ).toBeEnabled();
});
