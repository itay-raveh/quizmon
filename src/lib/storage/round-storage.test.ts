import type { RoundCompletion } from '../../domain/sync/progress';

const { transactPlayer, trackGameCompleted } = vi.hoisted(() => ({
  transactPlayer: vi.fn(),
  trackGameCompleted: vi.fn(),
}));

vi.mock('./player-storage', () => ({ transactPlayer }));
vi.mock('../analytics', () => ({ trackGameCompleted }));

import { commitRoundCompletion } from './round-storage';

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
