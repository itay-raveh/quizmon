import { formGroups, generations } from '../pokemon/types.ts';
import { gameVersions } from '../versions.ts';
import { currentDailyTrack } from './daily-track.ts';

export const dailyDefinition = {
  content: gameVersions.content,
  score: gameVersions.score,
  generator: gameVersions.daily,
  rules: gameVersions.questions,
  track: currentDailyTrack,
  generations,
  formGroups,
} as const;
