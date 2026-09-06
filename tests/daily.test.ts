import catalogData from '@/game/data/pokemon.json';
import { getQuestionTitle } from '@/game/game';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getDailyQuestionTypes,
  getLocalDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/game/daily';
import { generations, type PokemonCatalog } from '@/game/types';
import { questionRegistry, questionTypes } from '@/game/questions/registry';
import {
  markDailyReminderOffered,
  shouldOfferDailyReminder,
} from '@/notifications/daily-reminder-storage';

const catalog = catalogData as PokemonCatalog;

describe('Daily Challenge', () => {
  it('builds the same seeded five-question challenge for a date', () => {
    const first = buildDailyQuestions(catalog, '2026-09-01');
    const second = buildDailyQuestions(catalog, '2026-09-01');
    const schedule = getDailyQuestionTypes('2026-09-01');

    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(
      first.map((question) => ({
        correctOptions: question.answer.correctOptions,
        id: question.id,
        pokemonName: question.pokemonName,
        title: getQuestionTitle(question),
      })),
    ).toEqual([
      {
        correctOptions: ['gible'],
        id: 'type:gible:0',
        pokemonName: 'gible',
        title: 'Odd one out',
      },
      {
        correctOptions: ['emboar'],
        id: 'stat:emboar:1',
        pokemonName: 'emboar',
        title: 'Stat showdown',
      },
      {
        correctOptions: ['steel'],
        id: 'matchup:cottonee:2',
        pokemonName: 'cottonee',
        title: 'Type matchup',
      },
      {
        correctOptions: ['water'],
        id: 'evolution:azurill:3',
        pokemonName: 'azurill',
        title: 'Evolution shift',
      },
      {
        correctOptions: ['nidorino'],
        id: 'champion:nidorino:4',
        pokemonName: 'nidorino',
        title: 'Champion question',
      },
    ]);
    expect(first.map(getQuestionTitle)).toEqual(
      schedule.map((questionType) =>
        questionType === 'champion'
          ? 'Champion question'
          : questionRegistry[questionType].label,
      ),
    );
    expect(schedule.at(-1)).toBe('champion');
    expect(first.at(-1)?.searchOptions).toHaveLength(
      Object.keys(catalog.pokemon).length,
    );
    expect(first.at(-1)?.searchOptions).toContainEqual({
      dexNumber: 33,
      name: 'nidorino',
    });
    expect(
      schedule
        .slice(0, -1)
        .every((questionType) =>
          questionTypes.includes(
            questionType as (typeof questionTypes)[number],
          ),
        ),
    ).toBe(true);
  });

  it('changes both the question-type schedule and questions on a different date', () => {
    expect(getDailyQuestionTypes('2026-09-01')).not.toEqual(
      getDailyQuestionTypes('2026-09-02'),
    );
    expect(buildDailyQuestions(catalog, '2026-09-01')).not.toEqual(
      buildDailyQuestions(catalog, '2026-09-02'),
    );
  });

  it('allows question types to repeat before the Champion finale', () => {
    const standard = getDailyQuestionTypes('2026-09-02').slice(0, -1);
    expect(new Set(standard).size).toBeLessThan(standard.length);
  });

  it('uses all generations and a fixed five-question length', () => {
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
});

describe('daily dates', () => {
  it('uses the local calendar and accepts only real ISO dates from the query string', () => {
    expect(getLocalDate(new Date(2026, 8, 1, 23, 59, 59))).toBe('2026-09-01');
    expect(parseDailyDate('?daily=2024-02-29')).toBe('2024-02-29');
    expect(parseDailyDate('?daily=2026-02-29')).toBeNull();
    expect(parseDailyDate('?daily=September-1')).toBeNull();
  });

  it('only auto-starts an explicitly playable, valid daily link', () => {
    expect(shouldAutoStartDaily('?daily=2026-09-01&play=1')).toBe(true);
    expect(shouldAutoStartDaily('?daily=2026-09-01')).toBe(false);
    expect(shouldAutoStartDaily('?daily=2026-09-01&play=0')).toBe(false);
    expect(shouldAutoStartDaily('?daily=2026-02-29&play=1')).toBe(false);
    expect(shouldAutoStartDaily('?play=1')).toBe(false);
  });
});

describe('Daily reminder prompt', () => {
  beforeEach(() => window.localStorage.clear());

  it('offers after the first Daily and waits three more before asking again', () => {
    expect(shouldOfferDailyReminder(1)).toBe(true);
    markDailyReminderOffered(1);
    expect(shouldOfferDailyReminder(2)).toBe(false);
    expect(shouldOfferDailyReminder(3)).toBe(false);
    expect(shouldOfferDailyReminder(4)).toBe(true);
  });
});
