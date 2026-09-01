import catalogData from '@/game/data/pokemon.json';
import { getQuestionTitle } from '@/game/game';
import {
  buildDailyQuestions,
  getDailyModifiers,
  getDailyQuestionTypes,
  getUtcDate,
  parseDailyDate,
} from '@/game/daily';
import {
  generations,
  questionTypeDefinitions,
  questionTypes,
  type PokemonCatalog,
} from '@/game/types';

const catalog = catalogData as PokemonCatalog;

describe('daily Trainer Trial', () => {
  it('builds the same seeded ten-question challenge for a UTC date', () => {
    const first = buildDailyQuestions(catalog, '2026-09-01');
    const second = buildDailyQuestions(catalog, '2026-09-01');
    const schedule = getDailyQuestionTypes('2026-09-01');

    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(first.map(getQuestionTitle)).toEqual(
      schedule.map((questionType) =>
        questionType === 'champion'
          ? 'Champion question'
          : questionTypeDefinitions[questionType].label,
      ),
    );
    expect(schedule.at(-1)).toBe('champion');
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
    const standard = getDailyQuestionTypes('2026-09-01').slice(0, -1);
    expect(new Set(standard).size).toBeLessThan(standard.length);
  });

  it('uses all generations and a fixed ten-question length', () => {
    expect(
      getDailyModifiers({ soundEnabled: false, speedrunMode: true }),
    ).toMatchObject({
      generations: [...generations],
      isLimitActive: true,
      limit: 10,
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
});
