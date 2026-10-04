import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import evolutionData from '../../pokemon/data/topics-evolutions-0.json' with { type: 'json' };
import gameData from '../../pokemon/data/topics-games-0.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { gameLevels, type Level } from '../level.ts';
import { getQuestionVariant } from '../variants.ts';
import { buildQuestionType } from './registry.ts';

const catalog = {
  ...pokemonData,
  topics: {
    evolutions: evolutionData.values,
    games: gameData.values,
  },
} as unknown as PokemonCatalog;
const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
  name,
  pokemon,
}));
const build = (level: Level, seed: string, selected = pool, source = catalog) =>
  buildQuestionType(
    {
      catalog: source,
      level,
      pool: selected,
      random: createSeededRandom(seed),
      used: new Set(),
    },
    'evolutionConditions',
  );

it('does not offer a minimum level in single-select evolution conditions', () => {
  const level = gameLevels.find((level) => {
    const variant = getQuestionVariant('evolutionConditions', level)?.variant;
    return variant?.response.selection === 'single';
  })!;
  const levelOnly = pool.filter(({ name }) =>
    ['turtwig', 'grotle'].includes(name),
  );
  expect(build(level, 'turtwig', levelOnly)).toBeUndefined();

  const mixed = pool.filter(({ name }) =>
    ['rattata-alola', 'raticate-alola'].includes(name),
  );
  const question = build(level, 'rattata-alola', mixed);
  expect(question?.answer.correctOptions).toEqual(['Evolve during the night']);
  expect(
    question?.options.some((option) =>
      /^(?:Reach level|Level) \d+$/.test(option),
    ),
  ).toBe(false);
});

it('only offers minimum levels inside multi-select condition questions', () => {
  const level = gameLevels.find(
    (level) =>
      getQuestionVariant('evolutionConditions', level)?.variant.response
        .selection === 'adaptive',
  )!;
  const levelOnly = pool.filter(({ name }) =>
    ['turtwig', 'grotle'].includes(name),
  );
  expect(build(level, 'turtwig', levelOnly)).toBeUndefined();

  const mixed = pool.filter(({ name }) =>
    ['rattata-alola', 'raticate-alola'].includes(name),
  );
  const question = build(level, 'rattata-alola', mixed);
  expect(question?.answer.interaction).toBe('multi-select');
  expect(question?.answer.correctOptions).toEqual(
    expect.arrayContaining(['Level 20', 'Evolve during the night']),
  );
});

it('includes trade and held item as independent Rhyperior requirements', () => {
  const level = gameLevels.find(
    (level) =>
      (getQuestionVariant('evolutionConditions', level)?.variant
        .minimumEvolutionConditions ?? 0) > 1,
  )!;
  const selected = pool.filter(({ name }) =>
    ['rhydon', 'rhyperior'].includes(name),
  );
  const question = build(level, 'rhyperior', selected);
  expect(question?.answer.correctOptions).toHaveLength(2);
  expect(question?.answer.correctOptions).toEqual(
    expect.arrayContaining(['Trade', 'Hold Protector']),
  );
});

it('does not call either alternative method mandatory', () => {
  const level = gameLevels.find((level) => {
    const variant = getQuestionVariant('evolutionConditions', level)?.variant;
    return variant?.evolutionLocations && !variant.exactEvolutionValues;
  })!;
  const selected = pool.filter(({ name }) =>
    ['magneton', 'magnezone'].includes(name),
  );
  const source = {
    ...catalog,
    topics: {
      ...catalog.topics,
      evolutions: evolutionData.values.filter(
        (entry) =>
          entry.before === 'magneton' &&
          entry.after === 'magnezone' &&
          entry.game === 'sun',
      ),
    },
  } as PokemonCatalog;
  expect(build(level, 'alternate-methods', selected, source)).toBeUndefined();
});
