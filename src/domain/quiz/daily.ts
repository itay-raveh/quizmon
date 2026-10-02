import { isDailyDate } from '../../lib/validation.ts';

export const DAILY_QUESTION_COUNT = 5;
export const getUtcDate = (date = new Date()): string =>
  date.toISOString().slice(0, 10);

export const parseDailyDate = (pathname: string): string | null => {
  const value = pathname.startsWith('/daily/')
    ? pathname.slice('/daily/'.length)
    : null;
  return isDailyDate(value) ? value : null;
};

export const shouldAutoStartDaily = (
  pathname: string,
  search: string,
): boolean =>
  parseDailyDate(pathname) !== null &&
  new URLSearchParams(search).get('play') === '1';
