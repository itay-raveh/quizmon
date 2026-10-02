import type { TrainerStats } from '../../domain/player/progress';
import { getTrainerStats } from '../../domain/player/progress';
import { type SavedResults } from '../../domain/player/results';
import { canPersistPlayerData, readPlayerData } from './player-storage';

const readResults = (): SavedResults => readPlayerData().results;

export const canPersistResults = canPersistPlayerData;

export const readCompletedDailyCount = (): number =>
  Object.keys(readResults().daily).length;

export const readTrainerStats = (): TrainerStats => {
  const data = readPlayerData();
  return getTrainerStats(data.results, data.pokedex);
};
