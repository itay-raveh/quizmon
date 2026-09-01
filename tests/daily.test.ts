import {
  buildDailyQuestions,
  createSeededRandom,
  getDailyModifiers,
  getUtcDate,
  parseDailyDate,
} from '@/game/daily';
import type { PokemonCatalog } from '@/game/types';

const catalog = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [
    `pokemon-${index}`,
    {
      formCategory: index === 11 ? 'mega' : 'default',
      generation: index < 6 ? 'I' : 'IX',
    },
  ]),
) as PokemonCatalog;

describe('daily challenges', () => {
  it('builds the same ten default-form questions for the same UTC date', () => {
    const first = buildDailyQuestions(catalog, '2026-09-01');
    const second = buildDailyQuestions(catalog, '2026-09-01');

    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(first.every(({ pokemonName }) => pokemonName !== 'pokemon-11')).toBe(
      true,
    );
  });

  it('changes the question sequence on a different date', () => {
    expect(buildDailyQuestions(catalog, '2026-09-01')).not.toEqual(
      buildDailyQuestions(catalog, '2026-09-02'),
    );
  });

  it('creates a repeatable random sequence', () => {
    const first = createSeededRandom('seed');
    const second = createSeededRandom('seed');
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it('uses all generations without inheriting visual challenge modifiers', () => {
    expect(getDailyModifiers(false)).toMatchObject({
      formCategories: ['default'],
      generations: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'],
      isLimitActive: true,
      limit: 10,
      randomSprite: false,
      soundEnabled: false,
      whosThatPokemon: false,
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
