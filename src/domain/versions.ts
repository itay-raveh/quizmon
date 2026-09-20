import { GAMEPLAY_REVISION } from './quiz/gameplay-version.ts';
export const gameVersions = {
  content: 18,
  score: 3,
  questions: GAMEPLAY_REVISION,
  daily: GAMEPLAY_REVISION,
  league: GAMEPLAY_REVISION,
  progress: 3,
} as const;

export const formatVersions = {
  action: 1,
  hash: 1,
  completion: 1,
  accountExport: 1,
} as const;
