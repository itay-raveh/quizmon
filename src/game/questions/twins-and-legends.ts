import { shuffle } from '../random';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pokemonOptions,
  pokemonPrompt,
  textPrompt,
  type QuestionBuilder,
} from './shared';

const sameTypes = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((type) => right.includes(type));

export const buildTypeTwinsQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const families = new Map(
    pool.map(({ name }) => {
      let root = name;
      let parent = context.catalog.pokemon[root]?.evolvesFrom;
      while (parent) {
        root = parent;
        parent = context.catalog.pokemon[root]?.evolvesFrom;
      }
      return [name, root];
    }),
  );
  const typePairKey = (types: readonly string[]) => [...types].sort().join('|');
  const pairCounts = new Map<string, number>();
  const familyCounts = new Map<string, number>();
  const familyPairCounts = new Map<string, number>();
  for (const { name, pokemon } of pool) {
    const family = families.get(name)!;
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    if (pokemon.types.length !== 2) continue;
    const key = typePairKey(pokemon.types);
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    const familyPair = `${family}|${key}`;
    familyPairCounts.set(
      familyPair,
      (familyPairCounts.get(familyPair) ?? 0) + 1,
    );
  }
  const targets = pool.filter(({ name, pokemon }) => {
    if (pokemon.types.length !== 2) return false;
    const family = families.get(name)!;
    const key = typePairKey(pokemon.types);
    const matches =
      (pairCounts.get(key) ?? 0) -
      (familyPairCounts.get(`${family}|${key}`) ?? 0);
    const unrelated = pool.length - (familyCounts.get(family) ?? 0);
    return matches >= 1 && unrelated - matches >= 3;
  });
  const fresh = targets.filter(({ name }) => !context.used.has(name));
  const target = pick(fresh.length > 0 ? fresh : targets, context.random);
  if (!target?.pokemon.sprite) return undefined;
  const candidates = pool.filter(
    ({ name }) => families.get(name) !== families.get(target.name),
  );
  const correct = pick(
    candidates.filter(({ pokemon }) =>
      sameTypes(target.pokemon.types, pokemon.types),
    ),
    context.random,
  );
  if (!correct) return undefined;
  const distractors = candidates.filter(
    ({ pokemon }) => !sameTypes(target.pokemon.types, pokemon.types),
  );
  const options = pokemonOptions(context, correct, [], distractors);
  context.used.add(target.name);
  return {
    ...makeQuestion(
      'type',
      target,
      correct.name,
      options,
      pokemonPrompt(target, 'Which Pokémon has the same two types as ', '?'),
      { kind: 'pixel-sprite', src: target.pokemon.sprite },
    ),
    optionVisuals: getOptionVisuals(context, options),
    title: 'Type twins',
    visual: { kind: 'type-twins' },
  };
};

export const buildLegendHuntQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const matching = pool.filter(
    ({ pokemon }) => pokemon.isLegendary || pokemon.isMythical,
  );
  const others = pool.filter(
    ({ pokemon }) => !pokemon.isLegendary && !pokemon.isMythical,
  );
  const correctCount = pick(
    [2, 3].filter(
      (count) => matching.length >= count && others.length >= 4 - count,
    ),
    context.random,
  );
  if (!correctCount) return undefined;
  const legends = shuffle(matching, context.random).slice(0, correctCount);
  const ordinary = shuffle(others, context.random).slice(0, 4 - correctCount);
  const target = legends[0];
  if (!target) return undefined;
  const correctOptions = legends.map(({ name }) => name);
  const options = shuffle(
    [...correctOptions, ...ordinary.map(({ name }) => name)],
    context.random,
  );
  context.used.add(target.name);
  return {
    ...makeQuestion(
      'identity',
      target,
      target.name,
      options,
      textPrompt('Select every Legendary or Mythical Pokémon.'),
    ),
    answer: { correctOptions, interaction: 'multi-select' },
    optionClassifications: Object.fromEntries(
      [...legends, ...ordinary].map(({ name, pokemon }) => [
        name,
        pokemon.isMythical
          ? 'Mythical'
          : pokemon.isLegendary
            ? 'Legendary'
            : 'Neither',
      ]),
    ),
    optionVisuals: getOptionVisuals(context, options),
    title: 'Legend hunt',
  };
};
