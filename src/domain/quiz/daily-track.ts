import { isDailyDate, isRecord } from '../../lib/validation.ts';
import {
  difficultyLevels,
  difficultySchema,
  type Difficulty,
} from './difficulty.ts';

export interface DailyTrack {
  difficulty: Difficulty;
  scope: 'gen-i' | 'all';
}

export const currentDailyTrack: Readonly<DailyTrack> = {
  difficulty: 3,
  scope: 'all',
};

export const dailyTracks: readonly DailyTrack[] = difficultyLevels.flatMap(
  (difficulty) => [
    { difficulty, scope: 'gen-i' as const },
    { difficulty, scope: 'all' as const },
  ],
);

export const isDailyTrack = (value: unknown): value is DailyTrack =>
  isRecord(value) &&
  difficultySchema.safeParse(value.difficulty).success &&
  (value.scope === 'gen-i' || value.scope === 'all');

export const getDailyResultKey = (date: string, track?: DailyTrack): string =>
  track ? `${date}:${track.difficulty}:${track.scope}` : date;

export const parseDailyResultKey = (
  key: string,
): { date: string; track?: DailyTrack } | undefined => {
  if (key.length === 10 && isDailyDate(key)) return { date: key };
  const [date, level, scope, extra] = key.split(':');
  const difficulty = difficultySchema.safeParse(Number(level));
  if (
    !isDailyDate(date) ||
    !difficulty.success ||
    String(difficulty.data) !== level ||
    (scope !== 'gen-i' && scope !== 'all') ||
    extra !== undefined
  )
    return undefined;
  return { date, track: { difficulty: difficulty.data, scope } };
};

export const hasDailyResultOnDate = (
  results: Record<string, unknown>,
  date: string,
): boolean =>
  Object.keys(results).some((key) => parseDailyResultKey(key)?.date === date);

export const dailyTrackLabel = (track: DailyTrack): string =>
  `Level ${track.difficulty} · ${track.scope === 'gen-i' ? 'Gen I' : 'All generations'}`;
