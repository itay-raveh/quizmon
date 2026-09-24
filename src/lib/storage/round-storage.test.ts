import type { RoundCompletion } from '../../domain/sync/progress';

const { transactPlayer, trackGameCompleted, getPlayerDatabase, readState } =
  vi.hoisted(() => ({
    transactPlayer: vi.fn(),
    trackGameCompleted: vi.fn(),
    getPlayerDatabase: vi.fn(),
    readState: vi.fn(),
  }));

vi.mock('./player-storage', () => ({
  transactPlayer,
  getPlayerDatabase,
  readState,
}));
vi.mock('../analytics', () => ({ trackGameCompleted }));
vi.mock('../../domain/player/active-game', () => ({
  parseActiveGameSave: (round: Record<string, unknown>) => ({
    ...round,
    roundId: '00000000-0000-4000-8000-000000000001',
  }),
}));

import { commitRoundCompletion, initializeLocalRound } from './round-storage';

afterEach(() => vi.unstubAllGlobals());

it('does not replay a completed legacy round under its migrated ID', async () => {
  vi.stubGlobal('sessionStorage', { getItem: () => null, setItem: vi.fn() });
  const execute = vi.fn();
  const getAll = vi.fn((query: string) =>
    Promise.resolve(
      query.includes('local_rounds')
        ? [
            {
              payload: JSON.stringify({
                seed: 'old-seed',
                roundId: 'old-seed',
                completedAt: '2026-01-01T00:00:00.000Z',
                mode: { kind: 'training' },
              }),
            },
          ]
        : query.includes('local_completions')
          ? [{ id: 'old-seed' }]
          : [],
    ),
  );
  getPlayerDatabase.mockReturnValue({ getAll, execute });
  readState.mockResolvedValue({});

  await initializeLocalRound();

  expect(execute).toHaveBeenCalledWith(
    'DELETE FROM local_rounds WHERE id = ?',
    [expect.any(String)],
  );
  expect(transactPlayer).not.toHaveBeenCalled();
});

it('tracks completion only when the storage result says it was recorded', async () => {
  const completion = {
    mode: 'training',
    result: { score: 1200 },
  } as unknown as Omit<RoundCompletion, 'datasetId'>;
  transactPlayer
    .mockResolvedValueOnce({ recorded: true })
    .mockResolvedValueOnce({ recorded: false });

  await commitRoundCompletion(completion);
  await commitRoundCompletion(completion);

  expect(trackGameCompleted).toHaveBeenCalledTimes(1);
  expect(trackGameCompleted).toHaveBeenCalledWith(
    'training',
    completion.result,
  );
});
