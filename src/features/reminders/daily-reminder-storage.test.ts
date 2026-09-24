import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from './daily-reminder-storage';

it('keeps the prompt cadence for legacy and new history', () => {
  const values = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  const key = 'quizmon.baseline.daily-reminder-prompt';
  values.set(key, JSON.stringify({ version: 1, completedDailyCount: 2 }));
  expect(shouldOfferDailyReminder(4)).toBe(false);
  expect(shouldOfferDailyReminder(5)).toBe(true);
  markDailyReminderOffered(5);
  expect(JSON.parse(values.get(key)!)).toEqual({ completedDailyCount: 5 });
  expect(shouldOfferDailyReminder(7)).toBe(false);
  expect(shouldOfferDailyReminder(8)).toBe(true);
  vi.unstubAllGlobals();
});
