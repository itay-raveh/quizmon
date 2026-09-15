import {
  buildDailyForTest,
  dailySettings,
} from '../../../tests/fixtures/daily';
import { isDailyDate } from '../../lib/validation';
import { getLocalDate, parseDailyDate, shouldAutoStartDaily } from './daily';
import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from '../../features/reminders/daily-reminder-storage';

describe('Daily Challenge', () => {
  it('reproduces the live Level 3 lineup and varies it by date', () => {
    const first = buildDailyForTest('2026-09-01');
    expect(buildDailyForTest('2026-09-01')).toEqual(first);
    expect(first).toHaveLength(5);
    expect(first.at(-1)?.questionType).toBe('champion');
    expect(first.at(-1)?.searchOptions?.length).toBeGreaterThan(1);
    expect(buildDailyForTest('2026-09-02')).not.toEqual(first);
  });
  it('covers every eligible question family while keeping the Champion finale', () => {
    const seen = new Set<string>();
    const days = Math.ceil(dailySettings.questionTypes.length / 4) * 2;
    for (let day = 0; day < days; day++) {
      const date = new Date(Date.UTC(2026, 8, 1 + day))
        .toISOString()
        .slice(0, 10);
      const questions = buildDailyForTest(date);
      expect(questions).toHaveLength(5);
      expect(questions.at(-1)?.questionType).toBe('champion');
      for (const question of questions.slice(0, -1)) {
        expect(dailySettings.questionTypes).toContain(question.questionType);
        seen.add(question.questionType);
      }
    }
    expect([...seen].sort()).toEqual([...dailySettings.questionTypes].sort());
  });
});
describe('daily dates', () => {
  it('uses the local calendar', () => {
    expect(getLocalDate(new Date(2026, 8, 1, 23, 59, 59))).toBe('2026-09-01');
  });
  it.each([
    ['?daily=2024-02-29', '2024-02-29'],
    ['?daily=2026-02-29', null],
    ['?daily=September-1', null],
    ['?daily=2000-02-29', '2000-02-29'],
    ['?daily=1900-02-29', null],
    ['?daily=2026-04-31', null],
    ['?daily=2026-00-01', null],
    ['?daily=2026-01-00', null],
    ['?daily=0000-01-01', '0000-01-01'],
    ['?daily=9999-12-31', '9999-12-31'],
    ['?daily=2026-9-01', null],
    ['?daily=2026-09-01T00:00:00.000Z', null],
    ['?daily=%32%30%32%36-09-01', '2026-09-01'],
    ['?daily=2026-09-01&daily=2026-09-02', '2026-09-01'],
    ['?daily=&daily=2026-09-01', null],
    ['?daily=2026-09-01+', null],
    ['?daily=2026-09-01%0A', null],
    ['', null],
  ])('parses %s as %s', (search, expected) => {
    expect(parseDailyDate(search)).toBe(expected);
  });
  it('validates stored dates without query decoding or type coercion', () => {
    expect(isDailyDate('2024-02-29')).toBe(true);
    for (const value of [
      null,
      undefined,
      20260901,
      {},
      '2026-02-29',
      '%32%30%32%36-09-01',
      '2026-09-01&daily=2026-09-02',
      '2026-09-01+',
      '2026-09-01\n',
    ]) {
      expect(isDailyDate(value)).toBe(false);
    }
  });
  it.each([
    ['?daily=2026-09-01&play=1', true],
    ['?daily=2026-09-01', false],
    ['?daily=2026-09-01&play=0', false],
    ['?daily=2026-02-29&play=1', false],
    ['?play=1', false],
  ])('auto-starts %s only when playable: %s', (search, expected) => {
    expect(shouldAutoStartDaily(search)).toBe(expected);
  });
});
describe('Daily reminder prompt', () => {
  beforeEach(() => window.localStorage.clear());
  it.each([-1, 0.5, '1', null])(
    'ignores malformed prompt counters: %j',
    (completedDailyCount) => {
      window.localStorage.setItem(
        'quizmon.daily-reminder-prompt.v1',
        JSON.stringify({ completedDailyCount, version: 1 }),
      );
      expect(shouldOfferDailyReminder(1)).toBe(true);
    },
  );
  it('offers after the first Daily and waits three more before asking again', () => {
    expect(shouldOfferDailyReminder(1)).toBe(true);
    markDailyReminderOffered(1);
    expect(shouldOfferDailyReminder(2)).toBe(false);
    expect(shouldOfferDailyReminder(3)).toBe(false);
    expect(shouldOfferDailyReminder(4)).toBe(true);
  });
});
it('keeps the shared Daily independent of locale-specific collation', () => {
  const expected = buildDailyForTest('2026-09-08');
  const compare = vi
    .spyOn(String.prototype, 'localeCompare')
    .mockReturnValue(0);
  try {
    expect(buildDailyForTest('2026-09-08')).toEqual(expected);
  } finally {
    compare.mockRestore();
  }
});
