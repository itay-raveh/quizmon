import type { GameMode, GameResult } from '../quiz/types.ts';
import type { LeagueVictoryRecord } from './hall-of-fame.ts';
import type { PlayerData } from './player-save.ts';
import { addResultToProgress } from './progress.ts';
import { getUtcDate } from '../quiz/daily.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import { getBestResult, isBetterResult } from '../quiz/result-ranking.ts';
import { getRulesScoreKey } from '../quiz/round-rules.ts';
import { getUnifiedScoreKey } from '../quiz/scoring.ts';
import { getDailyResultKey } from '../quiz/daily-track.ts';
import { defaultGameSettings } from '../settings/game-settings.ts';
import type { GameSettings } from '../settings/types.ts';
export const applyResult = (
  data: PlayerData,
  mode: GameMode,
  result: GameResult,
  settings: GameSettings = defaultGameSettings,
  victory?: LeagueVictoryRecord,
  completedDate = getUtcDate(),
): { best: GameResult; isNewBest: boolean; isSaved: boolean } => {
  const { results, hallOfFame } = data;
  const recordProgress = () => {
    results.progress = addResultToProgress(
      results.progress,
      result,
      mode,
      settings,
    );
  };

  if (mode.kind === 'daily') {
    const key = getDailyResultKey(mode.date, mode.track);
    const dailyResult = mode.track
      ? { ...result, dailyTrack: { ...mode.track } }
      : result;
    const previous = results.daily[key];
    if (previous) {
      return { best: previous, isNewBest: false, isSaved: true };
    }
    const previousBest = getBestResult(
      Object.values(results.daily).filter(
        (previous) =>
          getRulesScoreKey(previous) === getRulesScoreKey(dailyResult) &&
          getDailyResultKey('', previous.dailyTrack) ===
            getDailyResultKey('', mode.track),
      ),
    );
    const isNewBest = !previousBest || isBetterResult(result, previousBest);
    results.daily[key] = dailyResult;
    recordProgress();
    if (
      mode.date === completedDate &&
      !results.streak.creditedDates.includes(mode.date)
    ) {
      results.streak.creditedDates.push(mode.date);
      results.streak.creditedDates.sort();
    }
    const isSaved = true;
    return {
      best: isNewBest ? dailyResult : previousBest,
      isNewBest: isNewBest && isSaved,
      isSaved,
    };
  }

  if (mode.kind === 'league') {
    if (victory && hallOfFame.some(({ id }) => id === victory.id)) {
      return { best: result, isNewBest: false, isSaved: true };
    }
    recordProgress();
    const completed = Boolean(victory) || isLeagueVictory(result);
    results.league.completed = results.league.completed || completed;
    if (completed) results.league.seed = null;
    const isSaved = Boolean(
      Object.assign(data, {
        results,
        ...(completed ? { leagueLineup: null } : {}),
        ...(completed && victory
          ? { hallOfFame: [...hallOfFame, victory] }
          : {}),
      }),
    );
    return {
      best: result,
      isNewBest: completed && isSaved,
      isSaved,
    };
  }

  const key = getUnifiedScoreKey(result);
  const previous = results.training[key];
  const isNewBest = !previous || isBetterResult(result, previous);
  recordProgress();
  if (isNewBest) results.training[key] = result;
  const isSaved = true;
  return {
    best: isNewBest ? result : previous,
    isNewBest: isNewBest && isSaved,
    isSaved,
  };
};
