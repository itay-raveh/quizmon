import { formatPokemonName } from '../format';
import { shuffle } from '../random';
import { statNames, type StatName } from '../types';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pickTarget,
  pokemonOptions,
  pokemonPrompt,
  pokemonSimilarity,
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

export const buildTypeQuestion: QuestionBuilder = (context) => {
  const target = pickTarget(context, ({ types }) => types.length > 0);
  if (!target) return undefined;
  const correct = pick(target.pokemon.types, context.random);
  if (!correct) return undefined;
  const candidates = Object.keys(context.catalog.typeRelations).filter(
    (type) => !target.pokemon.types.includes(type),
  );
  return makeQuestion(
    'type',
    target,
    correct,
    rankedOptionSet(
      correct,
      candidates,
      (type) =>
        context.pool.reduce(
          (best, candidate) =>
            candidate.pokemon.types.includes(type)
              ? Math.max(
                  best,
                  pokemonSimilarity(target.pokemon, candidate.pokemon),
                )
              : best,
          0,
        ),
      context.random,
    ),
    pokemonPrompt(target, 'Which type does ', ' have?'),
  );
};

const getTypePuzzlePool = (
  context: QuestionContext,
  type: string,
): { matching: Candidate[]; others: Candidate[] } => ({
  matching: context.pool.filter(
    ({ pokemon }) => pokemon.sprite && pokemon.types.includes(type),
  ),
  others: context.pool.filter(
    ({ pokemon }) => pokemon.sprite && !pokemon.types.includes(type),
  ),
});

export const buildOddOneOutQuestion: QuestionBuilder = (context) => {
  const type = pick(
    shuffle(Object.keys(context.catalog.typeRelations), context.random).filter(
      (candidate) => {
        const { matching, others } = getTypePuzzlePool(context, candidate);
        return matching.length >= 3 && others.length > 0;
      },
    ),
    context.random,
  );
  if (!type) return undefined;
  const { matching, others } = getTypePuzzlePool(context, type);
  const shared = shuffle(matching, context.random).slice(0, 3);
  const freshOthers = others.filter(({ name }) => !context.used.has(name));
  const target = pick(
    freshOthers.length > 0 ? freshOthers : others,
    context.random,
  );
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
    title: 'Odd one out',
  };
};

export const buildChooseAllTypeQuestion: QuestionBuilder = (context) => {
  const correctCount = context.random() < 0.5 ? 2 : 3;
  const type = pick(
    shuffle(Object.keys(context.catalog.typeRelations), context.random).filter(
      (candidate) => {
        const { matching, others } = getTypePuzzlePool(context, candidate);
        return (
          matching.length >= correctCount && others.length >= 4 - correctCount
        );
      },
    ),
    context.random,
  );
  if (!type) return undefined;
  const { matching, others } = getTypePuzzlePool(context, type);
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
      correctOptions[0] ?? target.name,
      options,
      textPrompt(`Select every ${formatPokemonName(type)}-type Pokémon.`),
    ),
    answer: { correctOptions, interaction: 'multi-select' },
    optionVisuals: getOptionVisuals(context, options),
    title: 'Type roundup',
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
  if (!correct || !evolutionName) return undefined;

  return {
    ...makeQuestion(
      'evolution',
      target,
      correct,
      rankedOptionSet(
        correct,
        Object.keys(context.catalog.typeRelations).filter(
          (type) => !target.pokemon.types.includes(type),
        ),
        (type) =>
          context.pool.reduce(
            (best, candidate) =>
              candidate.pokemon.types.includes(type)
                ? Math.max(
                    best,
                    pokemonSimilarity(target.pokemon, candidate.pokemon),
                  )
                : best,
            0,
          ),
        context.random,
      ),
      pokemonPrompt(target, 'Which type can ', ' gain after evolving?'),
      { kind: 'pixel-sprite', src: target.pokemon.sprite },
    ),
    title: 'Evolution shift',
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
    const options = rankedOptionSet(
      correct,
      candidates.filter((candidate) => !invalid.has(candidate)),
      (candidate) =>
        context.pool.reduce(
          (best, owner) =>
            owner.pokemon[property].includes(candidate)
              ? Math.max(best, pokemonSimilarity(target.pokemon, owner.pokemon))
              : best,
          0,
        ),
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
  const candidates = shuffle(context.pool, context.random);
  const target = candidates.find(({ pokemon }) => {
    const lower = candidates.filter(
      ({ pokemon: other }) => other.stats[stat] < pokemon.stats[stat],
    );
    return lower.length >= 3;
  });
  if (!target) return undefined;
  context.used.add(target.name);
  const distractors = candidates
    .filter(
      ({ name, pokemon }) =>
        name !== target.name &&
        pokemon.stats[stat] < target.pokemon.stats[stat],
    )
    .map(({ name }) => name);
  return makeQuestion(
    'stat',
    target,
    target.name,
    rankedOptionSet(
      target.name,
      distractors,
      (name) =>
        -Math.abs(
          target.pokemon.stats[stat] -
            (context.catalog.pokemon[name]?.stats[stat] ?? 0),
        ),
      context.random,
    ),
    textPrompt(
      `Which Pokémon has the highest base ${formatPokemonName(stat)}?`,
    ),
  );
};
