import { isDailyDate } from '@/game/validation';
import { catalog } from './fixtures/catalog';
import { buildDailyQuestions } from '@/game/game';
import { questionTypes } from '@/game/questions/definitions';
import {
  getDailyModifiers,
  getDailyQuestionTypes,
  getLocalDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/game/daily';
import { generations } from '@/game/types';

import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from '@/notifications/daily-reminder-storage';

describe('Daily Challenge', () => {
  it('reproduces a complete Daily lineup and varies it by date', () => {
    const first = buildDailyQuestions(catalog, '2026-09-01');
    const second = buildDailyQuestions(catalog, '2026-09-01');
    const schedule = getDailyQuestionTypes('2026-09-01');

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first.map(({ questionType }) => questionType)).toEqual(schedule);
    expect(schedule.at(-1)).toBe('champion');
    expect(first.at(-1)?.searchOptions).toHaveLength(
      Object.values(catalog.pokemon).filter(
        (pokemon) =>
          pokemon.hasDistinctDescription &&
          pokemon.genus &&
          pokemon.sprite &&
          (pokemon === catalog.pokemon[first.at(-1)!.pokemonName] ||
            pokemon.speciesName !==
              catalog.pokemon[first.at(-1)!.pokemonName]!.speciesName),
      ).length,
    );
    expect(first.at(-1)?.searchOptions).toContainEqual({
      dexNumber: 33,
      name: 'nidorino',
    });
    expect(questionTypes).toEqual(
      expect.arrayContaining(schedule.slice(0, -1)),
    );
    expect(schedule).not.toEqual(getDailyQuestionTypes('2026-09-02'));
    expect(first).not.toEqual(buildDailyQuestions(catalog, '2026-09-02'));
  });

  it('allows question types to repeat before the Champion finale', () => {
    const schedules = Array.from({ length: 30 }, (_, day) =>
      getDailyQuestionTypes(
        `2026-09-${String(day + 1).padStart(2, '0')}`,
      ).slice(0, -1),
    );
    expect(
      schedules.some((standard) => new Set(standard).size < standard.length),
    ).toBe(true);
  });

  it('uses all generations and the supplied experience settings', () => {
    expect(
      getDailyModifiers({
        answerFlow: 'instant',
        reduceMotion: true,
        soundVolume: 0,
        timerDisplay: 'milliseconds',
      }),
    ).toMatchObject({
      generations: [...generations],
      answerFlow: 'instant',
      reduceMotion: true,
      soundVolume: 0,
      timerDisplay: 'milliseconds',
    });
  });

  it('excludes advanced formats from both the schedule and generated questions', () => {
    const excluded = ['ability-check', 'move-check', 'stat-showdown'];
    const seen = new Set<string>();
    for (let day = 1; day <= 30; day += 1) {
      const date = `2026-09-${String(day).padStart(2, '0')}`;
      const schedule = getDailyQuestionTypes(date);
      const questions = buildDailyQuestions(catalog, date);
      expect(questions).toHaveLength(5);
      expect(questions.at(-1)?.questionType).toBe('champion');
      for (const type of [
        ...schedule,
        ...questions.map((question) => question.questionType),
      ]) {
        expect(excluded).not.toContain(type);
        seen.add(type);
      }
    }
    expect(seen.size).toBe(18);
    expect(seen).toContain('sprite-match');
    expect(seen).toContain('whos-that-pokemon');
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
  const expected = buildDailyQuestions(catalog, '2026-09-08');
  const compare = vi
    .spyOn(String.prototype, 'localeCompare')
    .mockReturnValue(0);
  try {
    expect(buildDailyQuestions(catalog, '2026-09-08')).toEqual(expected);
  } finally {
    compare.mockRestore();
  }
});
