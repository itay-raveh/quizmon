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
        correctOptions: ['mareep'],
        id: 'identity:mareep:0',
        pokemonName: 'mareep',
        title: 'Silhouette match',
      },
      {
        correctOptions: ['rock'],
        id: 'type:onix:1',
        pokemonName: 'onix',
        title: 'Type check',
      },
      {
        correctOptions: ['fighting'],
        id: 'matchup:tapu-lele:2',
        pokemonName: 'tapu-lele',
        title: 'Type matchup',
      },
      {
        correctOptions: ['vespiquen'],
        id: 'identity:vespiquen:3',
        pokemonName: 'vespiquen',
        title: 'Pokédex scan',
      },
      {
        correctOptions: ['skarmory'],
        id: 'champion:skarmory:4',
        pokemonName: 'skarmory',
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
    const schedules = Array.from({ length: 30 }, (_, day) =>
      getDailyQuestionTypes(
        `2026-09-${String(day + 1).padStart(2, '0')}`,
      ).slice(0, -1),
    );
    expect(
      schedules.some((standard) => new Set(standard).size < standard.length),
    ).toBe(true);
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
    expect(seen.size).toBe(14);
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
