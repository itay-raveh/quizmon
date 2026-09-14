import { type GameResult } from './types';

export const isBetterResult = (
  candidate: GameResult,
  previous: GameResult,
): boolean =>
  candidate.score > previous.score ||
  (candidate.score === previous.score &&
    getResultDuration(candidate) < getResultDuration(previous));

const getResultDuration = (result: GameResult): number =>
  result.elapsedMilliseconds ?? (result.elapsedSeconds + 1) * 1_000 - 1;

export const getBestResult = (
  results: readonly GameResult[],
): GameResult | undefined =>
  results.reduce<GameResult | undefined>(
    (best, result) => (!best || isBetterResult(result, best) ? result : best),
    undefined,
  );
