import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { AppNavigation } from './AppNavigation';

const account = vi.hoisted(() => ({
  owner: '',
  status: 'Saved on this device',
  error: '',
  issues: [] as unknown[],
}));
vi.mock('../features/account/account', () => ({
  accountSnapshot: () => account,
  subscribeAccount: () => () => {},
}));
const props = (): ComponentProps<typeof AppNavigation> => ({
  active: 'play',
  accountOpen: false,
  onNavigate: vi.fn(),
  onAccount: vi.fn(),
  onSettings: vi.fn(),
  trainerAvailable: true,
});
beforeEach(() => {
  account.owner = '';
  account.status = 'Saved on this device';
  account.error = '';
  account.issues = [];
});

it('reuses the account utility for a signed-in player and keeps sync status on the account control', () => {
  account.owner = 'player';
  account.status = 'Synced';
  render(<AppNavigation {...props()} active={null} accountOpen />);
  expect(screen.getAllByRole('button', { name: 'Account' })).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Account' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(
    screen.queryByRole('button', { name: 'Sign in' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Account' })).toHaveAttribute(
    'title',
    'Synced',
  );
  for (const label of ['Play', 'Trainer', 'Leaderboards']) {
    expect(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole(
        'button',
        { name: label },
      ),
    ).not.toHaveAttribute('aria-current');
  }
});

it.each(['error', 'issue'])(
  'uses the same account action when a sync %s needs attention',
  async (cause) => {
    account.owner = 'player';
    if (cause === 'error') account.error = 'Sync unavailable';
    else account.issues = [{}];
    const values = props();
    render(<AppNavigation {...values} />);
    expect(screen.getAllByRole('button', { name: /account/i })).toHaveLength(1);
    await userEvent.click(
      screen.getByRole('button', { name: 'Review account' }),
    );
    expect(values.onAccount).toHaveBeenCalledOnce();
  },
);

it('keeps account and leaderboard discovery available while Trainer data loads', () => {
  render(<AppNavigation {...props()} trainerAvailable={false} />);
  expect(screen.getByRole('button', { name: 'Trainer' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Settings' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Leaderboards' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
});
