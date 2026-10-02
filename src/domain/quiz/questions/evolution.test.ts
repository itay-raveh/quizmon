import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import evolutionData from '../../pokemon/data/topics-evolutions-0.json' with { type: 'json' };
import gameData from '../../pokemon/data/topics-games-0.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { gameLevels, type Level } from '../level.ts';
import { getQuestionVariant } from '../variants.ts';
import { responsePresets } from '../question-rules/shared.ts';
import { buildEvolution } from './evolution.ts';
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

it('offers level-up as one mixed condition when mixed conditions are enabled', () => {
  const requiredLevel = evolutionData.values
    .find((entry) => entry.before === 'turtwig' && entry.after === 'grotle')!
    .conditions.find((condition) => condition.startsWith('at level '))!
    .slice(9);
  const level = gameLevels.find((level) => {
    const variant = getQuestionVariant('evolutionConditions', level)?.variant;
    return (
      variant?.mixedLevelEvolutionConditions && !variant.exactEvolutionValues
    );
  })!;
  const selected = pool.filter(({ name }) =>
    ['turtwig', 'grotle'].includes(name),
  );
  const question = build(level, 'turtwig', selected);
  expect(question?.prompt).toMatchObject({
    kind: 'text',
    text: 'Which of these is a requirement for this evolution?',
  });
  expect(question?.answer.correctOptions).toEqual([
    `Reach level ${requiredLevel}`,
  ]);
  expect(
    question?.options.filter((option) => option.startsWith('Reach level ')),
  ).toEqual([`Reach level ${requiredLevel}`]);
});

it('asks for the exact evolution level when the rule requests it', () => {
  const requiredLevel = evolutionData.values
    .find((entry) => entry.before === 'turtwig' && entry.after === 'grotle')!
    .conditions.find((condition) => condition.startsWith('at level '))!
    .slice(9);
  const level = gameLevels.find((level) =>
    getQuestionVariant('evolutionConditions', level),
  )!;
  const selected = pool.filter(({ name }) =>
    ['turtwig', 'grotle'].includes(name),
  );
  const variant = {
    ...getQuestionVariant('evolutionConditions', level)!.variant,
    exactLevelQuestionChance: 1,
    exactEvolutionValues: true,
    compactEvolutionLabels: true,
    response: responsePresets.adaptive,
  };
  const question = buildEvolution({
    catalog,
    level,
    pool: selected,
    variant,
    random: () => 0,
    used: new Set(),
  });
  expect(question?.answer.correctOptions).toEqual([`Level ${requiredLevel}`]);
  expect(question?.answer.interaction).toBe('single-choice');
  expect(question?.options.every((option) => /^Level \d+$/.test(option))).toBe(
    true,
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
