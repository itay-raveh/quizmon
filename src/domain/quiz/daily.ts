import { gameVersions } from '../versions.ts';
import { isDailyDate } from '../../lib/validation.ts';

export const DAILY_CHALLENGE_VERSION = gameVersions.daily;
export const DAILY_QUESTION_COUNT = 5;
export const getUtcDate = (date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const parseDailyDate = (search: string): string | null => {
  const value = new URLSearchParams(search).get('daily');
  return isDailyDate(value) ? value : null;
};

export const shouldAutoStartDaily = (search: string): boolean =>
  parseDailyDate(search) !== null &&
  new URLSearchParams(search).get('play') === '1';
