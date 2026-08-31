import {
  buildQuestions,
  calculateScore,
  defaultModifiers,
  filterPokemon,
  formatDuration,
  formatPokemonName,
  getQuestionCount,
  normalizeModifiers,
  shuffle,
} from '@/game/game';
import type { Modifiers, PokemonCatalog } from '@/game/types';

const catalog: PokemonCatalog = {
  bulbasaur: { generation: 'I', formCategory: 'default' },
  charmander: { generation: 'I', formCategory: 'default' },
  squirtle: { generation: 'I', formCategory: 'default' },
  pikachu: { generation: 'I', formCategory: 'default' },
  'charizard-mega-x': { generation: 'VI', formCategory: 'mega' },
};

describe('normalizeModifiers', () => {
  it('returns defaults for malformed storage', () => {
    expect(normalizeModifiers('broken')).toEqual(defaultModifiers);
  });

  it('keeps valid selections and repairs an invalid limit', () => {
    expect(
      normalizeModifiers({
        generations: ['IX', 'not-a-generation'],
        formCategories: ['default'],
        randomSprite: true,
        whosThatPokemon: true,
        isLimitActive: true,
        limit: 0,
        speedrunMode: true,
      }),
    ).toEqual({
      generations: ['IX'],
      formCategories: ['default'],
      randomSprite: true,
      whosThatPokemon: true,
      isLimitActive: true,
      limit: 1,
      speedrunMode: true,
    });
  });

  it('restores required selections when stored arrays are empty', () => {
    expect(
      normalizeModifiers({ generations: [], formCategories: [] }),
    ).toMatchObject({
      generations: defaultModifiers.generations,
      formCategories: defaultModifiers.formCategories,
    });
  });
});

describe('filterPokemon', () => {
  it('filters by generation and form category together', () => {
    const modifiers: Modifiers = {
      ...defaultModifiers,
      generations: ['VI'],
      formCategories: ['mega'],
    };

    expect(filterPokemon(catalog, modifiers)).toEqual(['charizard-mega-x']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(
      filterPokemon(catalog, {
        ...defaultModifiers,
        generations: ['IX'],
      }),
    ).toEqual([]);
  });
});

describe('getQuestionCount', () => {
  it('clamps a configured limit to the available pool', () => {
    expect(getQuestionCount(4, { ...defaultModifiers, limit: 100 })).toBe(4);
  });

  it('uses the complete pool when the limit is disabled', () => {
    expect(
      getQuestionCount(4, { ...defaultModifiers, isLimitActive: false }),
    ).toBe(4);
  });

  it('returns zero for an empty pool', () => {
    expect(getQuestionCount(0, defaultModifiers)).toBe(0);
  });
});

describe('buildQuestions', () => {
  it('builds unique answer sets containing the correct Pokémon', () => {
    const questions = buildQuestions(
      catalog,
      { ...defaultModifiers, limit: 2 },
      () => 0.25,
    );

    expect(questions).toHaveLength(2);
    for (const question of questions) {
      expect(question.options).toContain(question.pokemonName);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options).toHaveLength(4);
    }
  });

  it('supports a pool smaller than four Pokémon', () => {
    const questions = buildQuestions(
      { pikachu: catalog.pikachu! },
      { ...defaultModifiers, limit: 1 },
      () => 0,
    );

    expect(questions).toEqual([
      { pokemonName: 'pikachu', options: ['pikachu'] },
    ]);
  });
});

describe('shuffle', () => {
  it('does not mutate its input', () => {
    const input = [1, 2, 3];
    expect(shuffle(input, () => 0)).toEqual([2, 3, 1]);
    expect(input).toEqual([1, 2, 3]);
  });
});

describe('calculateScore', () => {
  it('preserves the original score formula', () => {
    expect(calculateScore(8, 10, 20, defaultModifiers)).toBe(2560);
  });

  it('applies challenge multipliers', () => {
    expect(
      calculateScore(8, 10, 20, {
        ...defaultModifiers,
        randomSprite: true,
        whosThatPokemon: true,
      }),
    ).toBe(163840);
  });

  it('stays finite when a speedrun finishes inside one second', () => {
    const score = calculateScore(1, 1, 0, defaultModifiers);
    expect(score).toBe(1);
    expect(Number.isFinite(score)).toBe(true);
  });

  it('returns zero for an empty quiz', () => {
    expect(calculateScore(0, 0, 0, defaultModifiers)).toBe(0);
  });
});

describe('formatters', () => {
  it('formats elapsed time', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('formats API names for people', () => {
    expect(formatPokemonName('mr-mime')).toBe('Mr Mime');
  });
});
