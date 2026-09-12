import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import type { TrainerStats } from '../../domain/player/progress';
import {
  addResultToProgress,
  getDailyStreak,
  getTrainerStats,
} from '../../domain/player/progress';
import { type SavedResults } from '../../domain/player/results';
import { getLocalDate } from '../../domain/quiz/daily';
import { isLeagueVictory } from '../../domain/quiz/league';
import {
  getBestResult,
  isBetterResult,
} from '../../domain/quiz/result-ranking';
import { type GameMode, type GameResult } from '../../domain/quiz/types';
import { getRulesScoreKey } from '../../domain/quiz/round-rules';
import {
  getDailyResultKey,
  parseDailyResultKey,
  type DailyTrack,
} from '../../domain/quiz/daily-track';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { type GameSettings } from '../../domain/settings/types';
import {
  canPersistPlayerData,
  readPlayerData,
  updatePlayerData,
} from './player-storage';

const readResults = (): SavedResults => readPlayerData().results;

const writeResults = (results: SavedResults): boolean =>
  updatePlayerData({ results });

export const canPersistResults = canPersistPlayerData;

export const readDailyResult = (
  date: string,
  track?: DailyTrack,
): GameResult | null =>
  readResults().daily[getDailyResultKey(date, track)] ?? null;

export const readCompletedDailyCount = (): number =>
  new Set(
    Object.keys(readResults().daily)
      .map((key) => parseDailyResultKey(key)?.date)
      .filter(Boolean),
  ).size;

export const readDailyStreak = (today = getLocalDate()): number =>
  getDailyStreak(readResults().streak.creditedDates, today);

export const readTrainerStats = (): TrainerStats => {
  const data = readPlayerData();
  return getTrainerStats(data.results, data.pokedex);
};

export const saveResult = (
  mode: GameMode,
  result: GameResult,
  settings: GameSettings = defaultGameSettings,
  victory?: LeagueVictoryRecord,
): { best: GameResult; isNewBest: boolean; isSaved: boolean } => {
  const { results, hallOfFame } = readPlayerData();
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
      mode.date === getLocalDate() &&
      !results.streak.creditedDates.includes(mode.date)
    ) {
      results.streak.creditedDates.push(mode.date);
      results.streak.creditedDates.sort();
    }
    const isSaved = writeResults(results);
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
    const completed = isLeagueVictory(result);
    results.league.completed = results.league.completed || completed;
    if (completed) results.league.seed = null;
    const isSaved = updatePlayerData({
      results,
      ...(completed ? { leagueLineup: null } : {}),
      ...(completed && victory ? { hallOfFame: [...hallOfFame, victory] } : {}),
    });
    return {
      best: result,
      isNewBest: completed && isSaved,
      isSaved,
    };
  }

  const key = (getRulesScoreKey(result) ??
    settings.trainingMode) as keyof SavedResults['training'];
  const previous = results.training[key];
  const isNewBest = !previous || isBetterResult(result, previous);
  recordProgress();
  if (isNewBest) results.training[key] = result;
  const isSaved = writeResults(results);
  return {
    best: isNewBest ? result : previous,
    isNewBest: isNewBest && isSaved,
    isSaved,
  };
};
