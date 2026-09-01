import catalogData from '@/game/data/pokemon.json';
import {
  buildDailyQuestions,
  createSeededRandom,
  getDailyModifiers,
  getUtcDate,
  parseDailyDate,
} from '@/game/daily';
import { generations, type PokemonCatalog } from '@/game/types';

const catalog = catalogData as PokemonCatalog;

describe('daily Trainer Trial', () => {
  it('builds the same ten-category gauntlet for the same UTC date', () => {
    const first = buildDailyQuestions(catalog, '2026-09-01');
    const second = buildDailyQuestions(catalog, '2026-09-01');

    expect(first).toEqual(second);
    expect(first.map(({ category }) => category)).toEqual([
      'identity',
      'scale',
      'description',
      'type',
      'evolution',
      'ability',
      'move',
      'stat',
      'matchup',
      'champion',
    ]);
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

  it('uses all generations and a fixed ten-question length', () => {
    expect(getDailyModifiers(false)).toMatchObject({
      generations: [...generations],
      isLimitActive: true,
      limit: 10,
      soundEnabled: false,
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
