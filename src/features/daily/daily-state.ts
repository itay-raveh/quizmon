import { emptyPlayerData } from '@/domain/player/player-save';
import { readPlayerSave } from '@/lib/storage/player-storage';
import { readDailyAttempts } from '@/lib/storage/active-game-storage';

export const readDailyState = (date: string) => {
  try {
    const save = readPlayerSave();
    const attempts = readDailyAttempts(date, save.restoreId);
    for (const key of Object.keys(attempts)) {
      if (save.data.results.daily[key]) delete attempts[key];
    }
    return {
      readError: false,
      results: save.data.results,
      attempts,
    };
  } catch {
    return {
      readError: true,
      results: emptyPlayerData().results,
      attempts: {},
    };
  }
};
