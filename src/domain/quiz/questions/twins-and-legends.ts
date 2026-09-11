import { pick } from '../../../lib/random';
import { pokemonOptions, selectPokemonAnswerGroups } from './answers';
import { makeQuestion } from './assembly';
import { type QuestionBuilder } from './context';
import { pokemonPrompt, textPrompt } from './prompts';
import { optionSetRepetition, targetRepetition } from './repetition';
import { pickFreshTarget } from './selection';

const sameTypes = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((type) => right.includes(type));

export const buildTypeTwinsQuestion: QuestionBuilder = (context) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const typePairKey = (types: readonly string[]) => [...types].sort().join('|');
  const pairCounts = new Map<string, number>();
  const familyCounts = new Map<number, number>();
  const familyPairCounts = new Map<string, number>();
  for (const { pokemon } of pool) {
    const family = pokemon.evolutionFamily;
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
  const targets = pool.filter(({ pokemon }) => {
    if (pokemon.types.length !== 2) return false;
    const family = pokemon.evolutionFamily;
    const key = typePairKey(pokemon.types);
    const matches =
      (pairCounts.get(key) ?? 0) -
      (familyPairCounts.get(`${family}|${key}`) ?? 0);
    const unrelated = pool.length - (familyCounts.get(family) ?? 0);
    return matches >= 1 && unrelated - matches >= 3;
  });
  const target = pickFreshTarget(context, targets);
  if (!target?.pokemon.sprite) return undefined;
  const targetFamily = target.pokemon.evolutionFamily;
  const candidates = pool.filter(
    ({ pokemon }) => pokemon.evolutionFamily !== targetFamily,
  );
  const correct = pickFreshTarget(
    context,
    candidates.filter(({ pokemon }) =>
      sameTypes(target.pokemon.types, pokemon.types),
    ),
  );
  if (!correct) return undefined;
  const distractors = candidates.filter(
    ({ pokemon }) => !sameTypes(target.pokemon.types, pokemon.types),
  );
  const options = pokemonOptions(context, {
    correct,
    candidates: distractors,
  });
  return {
    ...makeQuestion(context, {
      repeat: targetRepetition({ pokemonOptions: true }),
      category: 'type',
      target,
      correct: correct.name,
      options,
      prompt: pokemonPrompt(
        target,
        'Which Pokémon has the same two types as ',
        '?',
      ),
      media: { kind: 'pixel-sprite', src: target.pokemon.sprite },
      presentation: { kind: 'pokemon-sprites' },
    }),
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
  const answers = selectPokemonAnswerGroups(context, {
    matching,
    others,
    correctCount,
  });
  if (!answers) return undefined;
  const { target, correctOptions, options } = answers;
  return makeQuestion(context, {
    repeat: optionSetRepetition({ subjects: 'correct' }),
    category: 'identity',
    target,
    correct: correctOptions,
    options,
    prompt: textPrompt('Select every Legendary or Mythical Pokémon.'),
    presentation: { kind: 'pokemon-sprites', labels: 'concealed' },
    details: { kind: 'classification' },
  });
};
