export const DAILY_QUESTION_COUNT = 5;
export const DAILY_LEVEL = 3;
export const getUtcDate = (date = new Date()): string =>
  date.toISOString().slice(0, 10);
