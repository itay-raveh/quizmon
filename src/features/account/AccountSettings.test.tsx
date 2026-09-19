import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountSettings } from './AccountSettings';

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

function publish(patch: Partial<typeof account.snapshot>) {
  account.snapshot = { ...account.snapshot, ...patch };
  account.listeners.forEach((listener) => listener());
}

it('submits email and a six-digit code with Enter in separate steps', async () => {
  const user = userEvent.setup();
  render(<AccountSettings />);
  expect(
    screen.getByText('Your Trainer name, partner and Daily scores are public.'),
  ).toBeVisible();
  await user.type(
    screen.getByLabelText('Email', { exact: true }),
    'trainer@example.test{Enter}',
  );
  await waitFor(() =>
    expect(account.send).toHaveBeenCalledExactlyOnceWith(
      'trainer@example.test',
    ),
  );
  const code = await screen.findByLabelText('Sign-in code');
  expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  expect(code).toHaveFocus();
  expect(
    screen.queryByLabelText('Email', { exact: true }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText(
      'Your Trainer name, partner and Daily scores are public.',
    ),
  ).not.toBeInTheDocument();
  await user.type(code, '012345{Enter}');
  await waitFor(() =>
    expect(account.verify).toHaveBeenCalledExactlyOnceWith(
      'trainer@example.test',
      '012345',
    ),
  );
});

it('shows account management without sign-in controls or a completion redirect', () => {
  account.snapshot = {
    ...account.snapshot,
    owner: 'existing',
    status: 'Synced',
  };
  const onComplete = vi.fn();
  render(<AccountSettings onComplete={onComplete} />);
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
  expect(onComplete).not.toHaveBeenCalled();
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
] as const)(
  'preserves the %s merge choice and completes only after successful handoff',
  async (name, merge, only) => {
    account.snapshot = { ...account.snapshot, mergeRequired: true };
    const onComplete = vi.fn();
    account.finish.mockImplementation(() => {
      publish({ owner: 'signed-in', mergeRequired: false });
      return Promise.resolve();
    });
    render(<AccountSettings onComplete={onComplete} />);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name }));
    if (only)
      expect(account.finish).toHaveBeenCalledExactlyOnceWith(merge, only);
    else expect(account.finish).toHaveBeenCalledExactlyOnceWith(merge);
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    act(() => publish({ pending: 1 }));
    expect(onComplete).toHaveBeenCalledOnce();
  },
);

it('keeps a failed merge choice available without reporting completion', async () => {
  account.snapshot = { ...account.snapshot, mergeRequired: true };
  account.finish.mockRejectedValue(
    new Error('Finish the unfinished guest round first.'),
  );
  const onComplete = vi.fn();
  render(<AccountSettings onComplete={onComplete} />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Add browser progress' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Finish the unfinished guest round first.',
  );
  expect(
    screen.getByRole('button', { name: 'Use account progress' }),
  ).toBeEnabled();
  expect(onComplete).not.toHaveBeenCalled();
});
