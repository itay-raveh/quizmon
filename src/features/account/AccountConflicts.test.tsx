import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccountIssue } from '../../lib/storage/account-issues';
import { AccountConflicts } from './AccountConflicts';

const issue: AccountIssue = {
  ownerId: 'account-one',
  generationId: crypto.randomUUID(),
  operationId: crypto.randomUUID(),
  reason: 'edit_conflict',
  payload: { unit: 'name', value: 'Offline edit', expectedRevision: 0 },
  resolving: false,
  edit: {
    unit: 'name',
    requested: 'Offline edit',
    accepted: 'Accepted',
    revision: 6,
  },
};

it.each([
  ['Keep account value', false],
  ['Use this edit', true],
] as const)(
  'reviews both values and saves the %s choice',
  async (name, reapply) => {
    const resolve = vi.fn().mockResolvedValue(undefined);
    render(
      <AccountConflicts issues={[issue]} resolve={resolve} disabled={false} />,
    );
    const group = screen.getByRole('group', { name: 'Trainer name' });
    expect(within(group).getByText('Accepted')).toBeVisible();
    expect(within(group).getByText('Offline edit')).toBeVisible();
    await userEvent.click(within(group).getByRole('button', { name }));
    expect(resolve).toHaveBeenCalledExactlyOnceWith(issue, reapply);
    expect(screen.getByRole('status')).toHaveTextContent(
      'saved on this device',
    );
    expect(screen.getByRole('status')).toHaveFocus();
  },
);

it('keeps the failed choice available and explains a stale review', async () => {
  const resolve = vi
    .fn()
    .mockRejectedValue(
      new Error('The account value changed. Review it before trying again.'),
    );
  render(
    <AccountConflicts issues={[issue]} resolve={resolve} disabled={false} />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Use this edit' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'account value changed',
  );
  expect(screen.getByRole('button', { name: 'Use this edit' })).toBeEnabled();
});

it('shows an offline resolution as pending instead of offering duplicate controls', () => {
  render(
    <AccountConflicts
      issues={[{ ...issue, resolving: true }]}
      resolve={vi.fn()}
      disabled={false}
    />,
  );
  expect(screen.getByText('Resolution waiting to sync.')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('explains a duplicate Daily without offering to replace its accepted score', async () => {
  const resolve = vi.fn().mockResolvedValue(undefined);
  const daily = {
    ...issue,
    reason: 'daily_already_recorded',
    edit: undefined,
    payload: { dailyDate: '2026-09-12' },
  };
  render(
    <AccountConflicts issues={[daily]} resolve={resolve} disabled={false} />,
  );
  expect(
    screen.getByRole('group', { name: 'Daily result for 2026-09-12' }),
  ).toHaveTextContent('Discoveries from both rounds are kept.');
  expect(
    screen.queryByRole('button', { name: 'Use this edit' }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
  expect(resolve).toHaveBeenCalledExactlyOnceWith(daily, false);
});
