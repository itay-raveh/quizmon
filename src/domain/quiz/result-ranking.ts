import { type GameMode, type GameResult } from './types';

import { type GameSettings, type TrainingMode } from '../settings/types';

export const getHighScoreKey = (
  mode: GameMode,
  settings: Pick<GameSettings, 'trainingMode'>,
): 'daily' | TrainingMode | null =>
  mode.kind === 'daily'
    ? 'daily'
    : mode.kind === 'training'
      ? settings.trainingMode
      : null;

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
