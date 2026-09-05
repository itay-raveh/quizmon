import catalogData from '@/game/data/pokemon.json';
import { getQuestionTitle } from '@/game/game';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getDailyQuestionTypes,
  getUtcDate,
  parseDailyDate,
  shouldAutoStartDaily,
} from '@/game/daily';
import { generations, type PokemonCatalog } from '@/game/types';
import { questionRegistry, questionTypes } from '@/game/questions/registry';

const catalog = catalogData as PokemonCatalog;

describe('Daily Challenge', () => {
  it('builds the same seeded five-question challenge for a UTC date', () => {
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
        correctOptions: ['rock'],
        id: 'matchup:pelipper:2',
        pokemonName: 'pelipper',
        title: 'Type matchup',
      },
      {
        correctOptions: ['dark'],
        id: 'evolution:torracat:3',
        pokemonName: 'torracat',
        title: 'Evolution shift',
      },
      {
        correctOptions: ['nidoran-m'],
        id: 'champion:nidoran-m:4',
        pokemonName: 'nidoran-m',
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
      dexNumber: 32,
      name: 'nidoran-m',
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
      getDailyModifiers({ soundEnabled: false, speedrunMode: true }),
    ).toMatchObject({
      generations: [...generations],
      limit: 5,
      soundEnabled: false,
      speedrunMode: true,
    });
  });
});

describe('daily dates', () => {
  it('uses UTC and accepts only real ISO dates from the query string', () => {
    expect(getUtcDate(new Date('2026-09-01T23:59:59.000Z'))).toBe('2026-09-01');
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
