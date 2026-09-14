import { pick, shuffle } from '../../../lib/random';
import { formatPokemonName } from '../../pokemon/format';
import { pokemonOptions, selectPokemonAnswerGroups } from './answers';
import { makeQuestion, targetMedia } from './assembly';
import {
  type Candidate,
  type QuestionBuilder,
  type QuestionContext,
} from './context';
import { pokemonPrompt, textPrompt } from './prompts';
import { optionSetRepetition, targetRepetition } from './repetition';
import {
  chooseTargets,
  distinctPokemon,
  pickFreshTarget,
  pickTarget,
} from './selection';
import { typeOptions } from './type-options';

export const buildTypeQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ types }) => types.length > 0);
  if (!target) return undefined;
  const correct = pick(target.pokemon.types, context.random);
  if (!correct) return undefined;
  return {
    ...makeQuestion(context, {
      repeat: targetRepetition({ pokemonOptions: false }),
      category: 'type',
      target,
      correct,
      options: typeOptions(context, target, correct),
      prompt: pokemonPrompt(target, 'Which type does ', ' have?'),
      presentation: { kind: 'text' },
      media: targetMedia(target),
    }),
    visual: { kind: 'type-check' },
  };
};
const countPokemonTypes = (candidates: readonly Candidate[]) => {
  const counts = new Map<string, number>();
  for (const { pokemon } of candidates) {
    for (const type of new Set(pokemon.types)) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return counts;
};
const pickTypePuzzlePool = (
  context: QuestionContext,
  matchingCount: number,
) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const typeCounts = countPokemonTypes(pool);
  const type = pick(
    shuffle(Object.keys(context.catalog.typeRelations), context.random).filter(
      (type) => {
        const count = typeCounts.get(type) ?? 0;
        return (
          count >= matchingCount && pool.length - count >= 4 - matchingCount
        );
      },
    ),
    context.random,
  );
  if (type === undefined) return undefined;
  return {
    type,
    matching: pool.filter(({ pokemon }) => pokemon.types.includes(type)),
    others: pool.filter(({ pokemon }) => !pokemon.types.includes(type)),
  };
};
export const buildOddOneOutQuestion: QuestionBuilder = (context) => {
  const pool = pickTypePuzzlePool(context, 3);
  if (!pool?.type) return undefined;
  const { matching, others } = pool;
  const shared = chooseTargets(context, matching, 3);
  if (shared.length !== 3) return undefined;
  const ambiguousTypes = new Set(
    [...countPokemonTypes(shared)]
      .filter(([, count]) => count === 2)
      .map(([type]) => type),
  );
  const target = pickFreshTarget(
    context,
    others.filter(
      (candidate) =>
        !candidate.pokemon.types.some((type) => ambiguousTypes.has(type)) &&
        distinctPokemon([candidate], (value) => value, shared).length > 0,
    ),
  );
  if (!target) return undefined;
  const options = shuffle(
    [...shared.map(({ name }) => name), target.name],
    context.random,
  );

  return makeQuestion(context, {
    repeat: optionSetRepetition({ subjects: 'all' }),
    category: 'type',
    target,
    correct: target.name,
    options,
    prompt: textPrompt('Three Pokémon share a type. Which one doesn’t?'),
    presentation: { kind: 'pokemon' },
  });
};
export const buildChooseAllTypeQuestion: QuestionBuilder = (context) => {
  const correctCount = context.random() < 0.5 ? 2 : 3;
  const pool = pickTypePuzzlePool(context, correctCount);
  if (!pool?.type) return undefined;
  const { type, matching, others } = pool;
  const answers = selectPokemonAnswerGroups(context, {
    matching,
    others,
    correctCount,
  });
  if (!answers) return undefined;
  const { target, correctOptions, options } = answers;

  return {
    ...makeQuestion(context, {
      repeat: optionSetRepetition({ subjects: 'correct', variant: [type] }),
      category: 'type',
      target,
      correct: correctOptions,
      options,
      prompt: textPrompt(
        `Select every ${formatPokemonName(type)}-type Pokémon.`,
      ),
      presentation: { kind: 'pokemon' },
    }),
    visual: { kind: 'type-roundup', type },
  };
};
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
      presentation: { kind: 'pokemon' },
    }),
    visual: { kind: 'type-twins' },
  };
};
