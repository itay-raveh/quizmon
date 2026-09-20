import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendsScreen } from './FriendsScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import {
  friendPage,
  lookupPlayer,
  ownPlayer,
  sendRequest,
} from './friends-client';
import {
  readDailyLeaderboard,
  readTrainingLeaderboard,
} from './leaderboards-client';

const account = vi.hoisted(() => ({ owner: '', mergeRequired: false }));
vi.mock('../account/account', () => ({
  accountSnapshot: () => account,
  subscribeAccount: () => () => {},
}));
vi.mock('./friends-client', () => ({
  ownPlayer: vi.fn(),
  friendPage: vi.fn(),
  lookupPlayer: vi.fn(),
  sendRequest: vi.fn(),
  changeRequest: vi.fn(),
}));
vi.mock('./leaderboards-client', () => ({
  readDailyLeaderboard: vi.fn(),
  readTrainingLeaderboard: vi.fn(),
}));
vi.mock('../../domain/quiz/daily', () => ({ getUtcDate: () => '2026-09-19' }));

const me = {
  id: 'me',
  name: 'My Trainer',
  code: '0123456789ABCDEF',
  partnerPokemon: null,
};
const peer = {
  id: 'peer',
  name: 'Another Trainer',
  code: 'FEDCBA9876543210',
  partnerPokemon: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  account.owner = '';
  account.mergeRequired = false;
  vi.mocked(ownPlayer).mockResolvedValue(me);
  vi.mocked(friendPage).mockResolvedValue({
    items: [],
    players: [],
    nextCursor: null,
  });
  vi.mocked(readDailyLeaderboard).mockImplementation((owner, date, scope) =>
    Promise.resolve({
      accountId: owner,
      date,
      scope,
      checkedAt: '2026-09-19T10:00:00Z',
      total: 0,
      viewer: null,
      items: [],
      nextCursor: null,
    }),
  );
  vi.mocked(readTrainingLeaderboard).mockImplementation((owner, scope) =>
    Promise.resolve({
      accountId: owner,
      scope,
      checkedAt: '2026-09-19T10:00:00Z',
      total: 0,
      viewer: null,
      items: [],
      nextCursor: null,
    }),
  );
});

it('points a guest invitation to the single header sign-in entry', () => {
  render(<FriendsScreen onBack={vi.fn()} initialInput={peer.code} />);
  expect(
    screen.getByText('Sign in to view this Trainer and send a friend request.'),
  ).toBeVisible();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(
    screen.getByText('Use Sign in in the header to get started.'),
  ).toBeVisible();
  expect(
    screen.queryByRole('button', { name: 'Sign in' }),
  ).not.toBeInTheDocument();
  expect(lookupPlayer).not.toHaveBeenCalled();
});

it('shows people first and keeps invite fields in Add friend', async () => {
  account.owner = 'me';
  vi.mocked(friendPage).mockImplementation((_owner, view) =>
    Promise.resolve({
      items:
        view === 'incoming'
          ? [
              {
                id: 'request',
                peerId: 'peer',
                direction: 'incoming',
                status: 'pending',
                createdAt: '',
                updatedAt: '',
              },
            ]
          : [],
      players: view === 'incoming' ? [peer] : [],
      nextCursor: null,
    }),
  );
  render(<FriendsScreen onBack={vi.fn()} />);
  expect(await screen.findByText(peer.name)).toBeVisible();
  expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
  expect(screen.queryByLabelText('Your friend link')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Add friend' }));
  expect(screen.getByLabelText('Your friend link')).toHaveValue(
    `${location.origin}/#friend=${me.code}`,
  );
  expect(
    screen.queryByRole('button', { name: 'Accept' }),
  ).not.toBeInTheDocument();
});

it('opens an authenticated invitation for review without sending a request', async () => {
  account.owner = 'me';
  vi.mocked(lookupPlayer).mockResolvedValue({ player: peer, request: null });
  render(<FriendsScreen onBack={vi.fn()} initialInput={peer.code} />);
  expect(
    await screen.findByRole('button', { name: 'Send friend request' }),
  ).toBeEnabled();
  expect(lookupPlayer).toHaveBeenCalledWith(
    'me',
    peer.code,
    expect.any(AbortSignal),
  );
  expect(sendRequest).not.toHaveBeenCalled();
});

it('reveals a manually found player after keyboard submission', async () => {
  const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
  account.owner = 'me';
  vi.mocked(lookupPlayer).mockResolvedValue({ player: peer, request: null });
  render(<FriendsScreen onBack={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add friend' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Friend code or link')).toBeEnabled(),
  );
  await userEvent.type(
    screen.getByLabelText('Friend code or link'),
    `${peer.code}{Enter}`,
  );
  await waitFor(() =>
    expect(screen.getByRole('region', { name: 'Found player' })).toHaveFocus(),
  );
  expect(
    screen.getByRole('button', { name: 'Send friend request' }),
  ).toBeEnabled();
  expect(scroll).toHaveBeenCalledWith({
    block: 'center',
  });
  expect(sendRequest).not.toHaveBeenCalled();
  scroll.mockRestore();
});

it('opens Global for the requested date without telling players to replay history', async () => {
  account.owner = 'me';
  const manage = vi.fn();
  render(
    <LeaderboardScreen onManageFriends={manage} initialDate="2026-09-12" />,
  );
  expect(await screen.findByText('No scores yet')).toBeVisible();
  expect(readDailyLeaderboard).toHaveBeenCalledWith(
    'me',
    '2026-09-12',
    'global',
    null,
    expect.any(AbortSignal),
  );
  expect(screen.getByRole('button', { name: 'Global' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.queryByText(/Finish it/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Friends' }));
  await waitFor(() =>
    expect(readDailyLeaderboard).toHaveBeenLastCalledWith(
      'me',
      '2026-09-12',
      'friends',
      null,
      expect.any(AbortSignal),
    ),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Manage friends' }));
  expect(manage).toHaveBeenCalledOnce();
});

it('retains loaded standings when refreshing fails', async () => {
  account.owner = 'me';
  const result = {
    player: me,
    rank: 4,
    score: 12500,
    elapsedMilliseconds: 12345,
  };
  vi.mocked(readDailyLeaderboard)
    .mockResolvedValueOnce({
      accountId: 'me',
      date: '2026-09-19',
      scope: 'global',
      checkedAt: '2026-09-19T10:00:00Z',
      total: 10,
      viewer: result,
      items: [result],
      nextCursor: null,
    })
    .mockRejectedValueOnce(new Error('Connection lost.'));
  render(<LeaderboardScreen onManageFriends={vi.fn()} />);
  expect(await screen.findByText('My Trainer (you)')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Showing the last loaded standings.',
  );
  expect(screen.getByText('My Trainer (you)')).toBeVisible();
});

it('restores a selected scope and reports changes for navigation to retain', async () => {
  account.owner = 'me';
  const changed = vi.fn();
  render(
    <LeaderboardScreen
      onManageFriends={vi.fn()}
      initialDate="2026-09-12"
      initialScope="friends"
      onSelectionChange={changed}
    />,
  );
  expect(await screen.findByText('No scores yet')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Friends' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Global' }));
  expect(changed).toHaveBeenCalledWith('2026-09-12', 'global', 'daily');
});

it('switches to Training and keeps its selection', async () => {
  account.owner = 'me';
  const changed = vi.fn();
  render(
    <LeaderboardScreen onManageFriends={vi.fn()} onSelectionChange={changed} />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Training' }));
  await waitFor(() =>
    expect(readTrainingLeaderboard).toHaveBeenCalledWith(
      'me',
      'global',
      null,
      expect.any(AbortSignal),
    ),
  );
  expect(screen.queryByLabelText('Daily date (UTC)')).not.toBeInTheDocument();
  expect(changed).toHaveBeenCalledWith('2026-09-19', 'global', 'training');
  expect(
    await screen.findByText('Finish a Training round to join the standings.'),
  ).toBeVisible();
});

it.each(['not-a-date', '2026-09-31', '2026-09-20'])(
  'uses today instead of invalid or future date %s',
  async (initialDate) => {
    account.owner = 'me';
    render(
      <LeaderboardScreen onManageFriends={vi.fn()} initialDate={initialDate} />,
    );
    await waitFor(() =>
      expect(readDailyLeaderboard).toHaveBeenCalledWith(
        'me',
        '2026-09-19',
        'global',
        null,
        expect.any(AbortSignal),
      ),
    );
  },
);
