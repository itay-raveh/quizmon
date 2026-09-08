import { formatPokemonName } from '../format';
import { shuffle } from '../random';
import { statNames, type StatName } from '../types';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pickFreshTarget,
  pickTarget,
  pokemonOptions,
  pokemonPrompt,
  createPokemonSimilarityScorer,
  randomOptionSet,
  rankedOptionSet,
  redactName,
  textPrompt,
  type Candidate,
  type QuestionBuilder,
  type QuestionContext,
} from './shared';

export const buildDescriptionQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ description }) => Boolean(description));
  if (!target) return undefined;
  return makeQuestion(
    'description',
    target,
    target.name,
    pokemonOptions(context, target),
    textPrompt(`“${redactName(target.pokemon.description, target.name)}”`),
  );
};

const typeOptions = (
  context: QuestionContext,
  target: Candidate,
  correct: string,
): string[] => {
  const similarityToTarget = createPokemonSimilarityScorer(target.pokemon);
  const bestScores = new Map<string, number>();
  for (const { pokemon } of context.pool) {
    const score = similarityToTarget(pokemon);
    for (const type of pokemon.types) {
      bestScores.set(type, Math.max(bestScores.get(type) ?? 0, score));
    }
  }
  return rankedOptionSet(
    correct,
    Object.keys(context.catalog.typeRelations).filter(
      (type) => !target.pokemon.types.includes(type),
    ),
    (type) => bestScores.get(type) ?? 0,
    context.random,
  );
};

export const buildTypeQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ types }) => types.length > 0);
  if (!target) return undefined;
  const correct = pick(target.pokemon.types, context.random);
  if (!correct) return undefined;
  return {
    ...makeQuestion(
      'type',
      target,
      correct,
      typeOptions(context, target, correct),
      pokemonPrompt(target, 'Which type does ', ' have?'),
    ),
    visual: { kind: 'type-check' },
  };
};

const pickTypePuzzlePool = (
  context: QuestionContext,
  matchingCount: number,
) => {
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  return pick(
    shuffle(Object.keys(context.catalog.typeRelations), context.random)
      .map((type) => ({
        type,
        matching: pool.filter(({ pokemon }) => pokemon.types.includes(type)),
        others: pool.filter(({ pokemon }) => !pokemon.types.includes(type)),
      }))
      .filter(
        ({ matching, others }) =>
          matching.length >= matchingCount &&
          others.length >= 4 - matchingCount,
      ),
    context.random,
  );
};

export const buildOddOneOutQuestion: QuestionBuilder = (context) => {
  const pool = pickTypePuzzlePool(context, 3);
  if (!pool?.type) return undefined;
  const { matching, others } = pool;
  const shared = shuffle(matching, context.random).slice(0, 3);
  const target = pickFreshTarget(context, others);
  if (!target) return undefined;
  context.used.add(target.name);
  const options = shuffle(
    [...shared.map(({ name }) => name), target.name],
    context.random,
  );

  return {
    ...makeQuestion(
      'type',
      target,
      target.name,
      options,
      textPrompt('Which Pokémon does not belong?'),
    ),
    optionVisuals: getOptionVisuals(context, options),
  };
};

export const buildChooseAllTypeQuestion: QuestionBuilder = (context) => {
  const correctCount = context.random() < 0.5 ? 2 : 3;
  const pool = pickTypePuzzlePool(context, correctCount);
  if (!pool?.type) return undefined;
  const { type, matching, others } = pool;
  const selectedMatching = shuffle(matching, context.random).slice(
    0,
    correctCount,
  );
  const selectedOthers = shuffle(others, context.random).slice(
    0,
    4 - correctCount,
  );
  const target = selectedMatching[0];
  if (!target) return undefined;
  context.used.add(target.name);
  const correctOptions = selectedMatching.map(({ name }) => name);
  const options = shuffle(
    [...correctOptions, ...selectedOthers.map(({ name }) => name)],
    context.random,
  );

  return {
    ...makeQuestion(
      'type',
      target,
      correctOptions,
      options,
      textPrompt(`Select every ${formatPokemonName(type)}-type Pokémon.`),
    ),
    optionVisuals: getOptionVisuals(context, options),
    visual: { kind: 'type-roundup', type },
  };
};

export const buildEvolutionShiftQuestion: QuestionBuilder = (context) => {
  const poolNames = new Set(context.pool.map(({ name }) => name));
  const target = pickTarget(context, ({ evolvesTo, types }) => {
    if (evolvesTo.length !== 1) return false;
    const evolutionName = evolvesTo[0];
    const evolution = evolutionName
      ? context.catalog.pokemon[evolutionName]
      : undefined;
    return Boolean(
      evolutionName &&
      poolNames.has(evolutionName) &&
      evolution?.sprite &&
      evolution.types.filter((type) => !types.includes(type)).length === 1,
    );
  });
  if (!target?.pokemon.sprite) return undefined;
  const evolutionName = target.pokemon.evolvesTo[0];
  const evolution = evolutionName
    ? context.catalog.pokemon[evolutionName]
    : undefined;
  const correct = evolution?.types.find(
    (type) => !target.pokemon.types.includes(type),
  );
  if (!correct || !evolutionName || !evolution?.sprite) return undefined;

  return {
    ...makeQuestion(
      'evolution',
      target,
      correct,
      typeOptions(context, target, correct),
      pokemonPrompt(target, 'Which type can ', ' gain after evolving?'),
      { kind: 'pixel-sprite', src: target.pokemon.sprite },
    ),
    visual: {
      evolution: {
        dexNumber: evolution.id,
        name: evolutionName,
        src: evolution.sprite,
        types: evolution.types,
      },
      gainedType: correct,
      kind: 'evolution-shift',
    },
  };
};

export const buildPropertyQuestion =
  (category: 'ability' | 'move'): QuestionBuilder =>
  (context) => {
    const property = category === 'ability' ? 'abilities' : 'levelMoves';
    const target = pickTarget(
      context,
      (pokemon) => pokemon[property].length > 0,
    );
    if (!target) return undefined;
    const correct = pick(target.pokemon[property], context.random);
    if (!correct) return undefined;
    const candidates = context.pool.flatMap(({ pokemon }) => pokemon[property]);
    const invalid = new Set(target.pokemon[property]);
    const options = randomOptionSet(
      correct,
      candidates.filter((candidate) => !invalid.has(candidate)),
      context.random,
    );
    const subject = category === 'ability' ? 'ability' : 'move by leveling up';
    return makeQuestion(
      category,
      target,
      correct,
      options,
      pokemonPrompt(target, `Which ${subject} can `, ' have?'),
    );
  };

export const buildStatQuestion: QuestionBuilder = (context) => {
  const stat = pick(statNames, context.random) as StatName;
  const direction = context.random() < 0.5 ? 'highest' : 'lowest';
  const candidates = shuffle(context.pool, context.random);
  const isDistractor = (target: Candidate, other: Candidate) =>
    direction === 'highest'
      ? other.pokemon.stats[stat] < target.pokemon.stats[stat]
      : other.pokemon.stats[stat] > target.pokemon.stats[stat];
  const target = candidates.find(
    (candidate) =>
      candidates.filter((other) => isDistractor(candidate, other)).length >= 3,
  );
  if (!target) return undefined;
  context.used.add(target.name);
  const distractors = candidates
    .filter(
      (other) => other.name !== target.name && isDistractor(target, other),
    )
    .map(({ name }) => name);
  const options = randomOptionSet(target.name, distractors, context.random);
  const optionStats = Object.fromEntries(
    options.flatMap((name) => {
      const pokemon = context.catalog.pokemon[name];
      return pokemon ? [[name, pokemon.stats[stat]] as const] : [];
    }),
  );

  return {
    ...makeQuestion(
      'stat',
      target,
      target.name,
      options,
      textPrompt(
        `Which Pokémon has the ${direction} ${formatPokemonName(stat)}?`,
      ),
    ),
    optionStats,
    visual: { direction, kind: 'stat-showdown', stat },
  };
};
