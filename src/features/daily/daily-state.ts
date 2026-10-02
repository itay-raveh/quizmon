import { emptyPlayerData } from '@/domain/player/player-save';
import { readPlayerSave } from '@/lib/storage/player-storage';
import { readLocalDailyAttempts } from '@/lib/storage/player-storage';

export const readDailyState = (date: string) => {
  try {
    const save = readPlayerSave();
    return {
      readError: false,
      results: save.data.results,
      forfeited:
        Boolean(readLocalDailyAttempts()[date]) &&
        !save.data.results.daily[date],
    };
  } catch {
    return {
      readError: true,
      results: emptyPlayerData().results,
      forfeited: false,
    };
  }
};
