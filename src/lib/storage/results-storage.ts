import { applyResult } from '../../domain/player/game-progress';
export { applyResult } from '../../domain/player/game-progress';
import type { GameMode, GameResult } from '../../domain/quiz/types';
import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import type { TrainerStats } from '../../domain/player/progress';
import { getDailyStreak, getTrainerStats } from '../../domain/player/progress';
import { type SavedResults } from '../../domain/player/results';
import { getUtcDate } from '../../domain/quiz/daily';
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
  transactPlayer,
} from './player-storage';

const readResults = (): SavedResults => readPlayerData().results;

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

export const readDailyStreak = (today = getUtcDate()): number =>
  getDailyStreak(readResults().streak.creditedDates, today);

export const readTrainerStats = (): TrainerStats => {
  const data = readPlayerData();
  return getTrainerStats(data.results, data.pokedex);
};

export const saveResult = async (
  mode: GameMode,
  result: GameResult,
  settings: GameSettings = defaultGameSettings,
  victory?: LeagueVictoryRecord,
) =>
  transactPlayer((state) =>
    applyResult(state.save.data, mode, result, settings, victory),
  );
