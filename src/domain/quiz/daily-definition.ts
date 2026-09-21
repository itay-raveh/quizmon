import { formGroups, generations } from '../pokemon/types.ts';
import { gameVersions } from '../versions.ts';
import { currentDailyTrack } from './daily-track.ts';

export const dailyDefinition = {
  score: gameVersions.score,
  track: currentDailyTrack,
  generations,
  formGroups,
} as const;
