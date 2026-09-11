import { pick, shuffle } from '../../../lib/random';
import { formatPokemonName } from '../../pokemon/format';
import { statNames, type StatName } from '../../pokemon/types';
import {
  createPokemonSimilarityScorer,
  pokemonOptions,
  randomOptionSet,
  rankedOptionSet,
  selectPokemonAnswerGroups,
} from './answers';
import { makeQuestion, targetMedia } from './assembly';
import {
  type Candidate,
  type QuestionBuilder,
  type QuestionContext,
} from './context';
import { pokemonPrompt, redactName, textPrompt } from './prompts';
import { optionSetRepetition, targetRepetition } from './repetition';
import {
  chooseTargets,
  distinctPokemon,
  pickFreshTarget,
  pickTarget,
} from './selection';

export const buildDescriptionQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ description }) => Boolean(description));
  if (!target) return undefined;
  return makeQuestion(context, {
    repeat: targetRepetition({ pokemonOptions: true }),
    category: 'description',
    target,
    correct: target.name,
    options: pokemonOptions(context, {
      correct: target,
      candidates: context.pool.filter(({ pokemon }) =>
        Boolean(pokemon.description),
      ),
    }),
    prompt: textPrompt(
      `“${redactName(target.pokemon.description, target.name, target.pokemon.speciesName)}”`,
    ),
    presentation: { kind: 'pokemon-sprites' },
  });
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
    presentation: { kind: 'pokemon-sprites' },
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
      presentation: { kind: 'pokemon-sprites' },
    }),
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
    ...makeQuestion(context, {
      repeat: targetRepetition({
        pokemonOptions: false,
        related: [evolutionName],
      }),
      category: 'evolution',
      target,
      correct,
      options: typeOptions(context, target, correct),
      prompt: pokemonPrompt(target, 'Which type can ', ' gain after evolving?'),
      media: { kind: 'pixel-sprite', src: target.pokemon.sprite },
      presentation: { kind: 'text' },
    }),
    visual: {
      evolution: {
        dexNumber: evolution.speciesId,
        name: evolutionName,
        src: evolution.sprite,
        types: evolution.types,
      },
      gainedType: correct,
      kind: 'evolution-shift',
    },
  };
};

export const buildPropertyQuestion = (
  category: 'ability' | 'move',
): QuestionBuilder => {
  const property = category === 'ability' ? 'abilities' : 'levelMoves';
  const subject = category === 'ability' ? 'ability' : 'move by leveling up';
  return (context) => {
    const target = pickTarget(
      context,
      (pokemon) => pokemon[property].length > 0,
    );
    if (!target) return undefined;
    const correct = pick(target.pokemon[property], context.random);
    if (!correct) return undefined;
    const candidates = new Set(
      context.pool.flatMap(({ pokemon }) => pokemon[property]),
    );
    for (const invalid of target.pokemon[property]) candidates.delete(invalid);
    const options = randomOptionSet(correct, [...candidates], context.random);
    return makeQuestion(context, {
      repeat: targetRepetition({ pokemonOptions: false }),
      category,
      target,
      correct,
      options,
      prompt: pokemonPrompt(target, `Which ${subject} can `, ' have?'),
      presentation: { kind: 'text' },
      media: targetMedia(target),
    });
  };
};

export const buildStatQuestion: QuestionBuilder = (context) => {
  const stat = pick(statNames, context.random) as StatName;
  const direction = context.random() < 0.5 ? 'highest' : 'lowest';
  const candidates = context.pool;
  const isDistractor = (target: Candidate, other: Candidate) =>
    direction === 'highest'
      ? other.pokemon.stats[stat] < target.pokemon.stats[stat]
      : other.pokemon.stats[stat] > target.pokemon.stats[stat];
  const values = candidates
    .map(({ pokemon }) => pokemon.stats[stat])
    .sort((a, b) => a - b);
  const boundary = values[direction === 'highest' ? 2 : values.length - 3];
  const eligible = candidates.filter(
    ({ pokemon }) =>
      boundary !== undefined &&
      (direction === 'highest'
        ? pokemon.stats[stat] > boundary
        : pokemon.stats[stat] < boundary),
  );
  const target = pickFreshTarget(context, eligible);
  if (!target) return undefined;
  const distractors = chooseTargets(
    context,
    candidates.filter((other) => isDistractor(target, other)),
    3,
    [target],
  );
  if (distractors.length !== 3) return undefined;
  const options = shuffle(
    [target.name, ...distractors.map(({ name }) => name)],
    context.random,
  );

  return {
    ...makeQuestion(context, {
      repeat: optionSetRepetition({
        subjects: 'all',
        variant: [stat, direction],
      }),
      category: 'stat',
      target,
      correct: target.name,
      options,
      prompt: textPrompt(
        `Which Pokémon has the ${direction} ${formatPokemonName(stat)}?`,
      ),
      presentation: { kind: 'pokemon-sprites' },
      details: { kind: 'stat', stat },
    }),
    visual: { direction, kind: 'stat-showdown', stat },
  };
};
