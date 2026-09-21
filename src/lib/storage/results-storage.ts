import type { GameResult } from '../../domain/quiz/types';
import type { TrainerStats } from '../../domain/player/progress';
import { getTrainerStats } from '../../domain/player/progress';
import { type SavedResults } from '../../domain/player/results';
import {
  getDailyResultKey,
  parseDailyResultKey,
  type DailyTrack,
} from '../../domain/quiz/daily-track';
import { canPersistPlayerData, readPlayerData } from './player-storage';

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

export const readTrainerStats = (): TrainerStats => {
  const data = readPlayerData();
  return getTrainerStats(data.results, data.pokedex);
};
