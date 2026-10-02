import type { GameMode, GameResult } from '../quiz/types.ts';
import type { LeagueVictoryRecord } from './hall-of-fame.ts';
import type { PlayerData } from './player-save.ts';
import { addResultToProgress } from './progress.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import { getBestResult, isBetterResult } from '../quiz/result-ranking.ts';
import { getRulesScoreKey } from '../quiz/round-rules.ts';
export const applyResult = (
  data: PlayerData,
  mode: GameMode,
  result: GameResult,
  victory?: LeagueVictoryRecord,
): { best: GameResult; isNewBest: boolean } => {
  const { results, hallOfFame } = data;
  const recordProgress = () => {
    results.progress = addResultToProgress(results.progress, result, mode);
  };

  if (mode.kind === 'daily') {
    const key = mode.date;
    const dailyResult = result;
    const previous = results.daily[key];
    if (previous) {
      return { best: previous, isNewBest: false };
    }
    const previousBest = getBestResult(
      Object.values(results.daily).filter(
        (previous) =>
          getRulesScoreKey(previous) === getRulesScoreKey(dailyResult),
      ),
    );
    const isNewBest = !previousBest || isBetterResult(result, previousBest);
    results.daily[key] = dailyResult;
    recordProgress();
    if (!results.streak.creditedDates.includes(mode.date)) {
      results.streak.creditedDates.push(mode.date);
      results.streak.creditedDates.sort();
    }
    return {
      best: isNewBest ? dailyResult : previousBest,
      isNewBest,
    };
  }

  if (mode.kind === 'league') {
    if (victory && hallOfFame.some(({ id }) => id === victory.id)) {
      return { best: result, isNewBest: false };
    }
    recordProgress();
    const completed = Boolean(victory) || isLeagueVictory(result);
    results.league.completed = results.league.completed || completed;
    if (completed) results.league.seed = null;
    if (completed && victory) data.hallOfFame = [...hallOfFame, victory];
    return {
      best: result,
      isNewBest: completed,
    };
  }

  const previous = results.training.score;
  const isNewBest = !previous || isBetterResult(result, previous);
  recordProgress();
  if (isNewBest) results.training.score = result;
  return {
    best: isNewBest ? result : previous,
    isNewBest,
  };
};
