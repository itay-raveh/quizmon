import { isDailyDate } from '../../lib/validation';

export const DAILY_QUESTION_COUNT = 5;
export const getLocalDate = (date = new Date()): string =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => part.toString().padStart(index === 0 ? 4 : 2, '0'))
    .join('-');

export const parseDailyDate = (search: string): string | null => {
  const value = new URLSearchParams(search).get('daily');
  return isDailyDate(value) ? value : null;
};

export const shouldAutoStartDaily = (search: string): boolean =>
  parseDailyDate(search) !== null &&
  new URLSearchParams(search).get('play') === '1';
