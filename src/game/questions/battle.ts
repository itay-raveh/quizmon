import { shuffle } from '../random';
import type { PokemonCatalog } from '../types';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pickTarget,
  pokemonOptions,
  pokemonPrompt,
  rankedOptionSet,
  type QuestionBuilder,
} from './shared';

const attackMultiplier = (
  catalog: PokemonCatalog,
  attackType: string,
  defenderTypes: readonly string[],
): number => {
  const relations = catalog.typeRelations[attackType];
  if (!relations) return 1;
  return defenderTypes.reduce((multiplier, defenderType) => {
    if (relations.noneTo.includes(defenderType)) return 0;
    if (relations.doubleTo.includes(defenderType)) return multiplier * 2;
    if (relations.halfTo.includes(defenderType)) return multiplier / 2;
    return multiplier;
  }, 1);
};

const hasTypeAdvantage = (
  catalog: PokemonCatalog,
  attackerTypes: readonly string[],
  defenderTypes: readonly string[],
): boolean =>
  attackerTypes.some(
    (type) => attackMultiplier(catalog, type, defenderTypes) > 1,
  );

const hasDoubleTypeAdvantage = (
  catalog: PokemonCatalog,
  attackerTypes: readonly string[],
  defenderTypes: readonly string[],
): boolean =>
  attackerTypes.some(
    (type) => attackMultiplier(catalog, type, defenderTypes) === 2,
  );

export const buildMatchupQuestion: QuestionBuilder = (context) => {
  const attackTypes = Object.keys(context.catalog.typeRelations);
  const target = pickTarget(context, ({ types }) =>
    attackTypes.some(
      (type) => attackMultiplier(context.catalog, type, types) === 2,
    ),
  );
  if (!target) return undefined;
  const strong = attackTypes.filter(
    (type) =>
      attackMultiplier(context.catalog, type, target.pokemon.types) === 2,
  );
  const correct = pick(strong, context.random);
  if (!correct) return undefined;
  const distractors = attackTypes.filter(
    (type) =>
      type !== correct &&
      attackMultiplier(context.catalog, type, target.pokemon.types) <= 1,
  );
  return {
    ...makeQuestion(
      'matchup',
      target,
      correct,
      rankedOptionSet(
        correct,
        distractors,
        (type) => {
          const relations = context.catalog.typeRelations[type];
          const partialAdvantages = target.pokemon.types.filter((targetType) =>
            relations?.doubleTo.includes(targetType),
          ).length;
          return (
            partialAdvantages * 4 +
            (attackMultiplier(context.catalog, type, target.pokemon.types) === 1
              ? 2
              : 0)
          );
        },
        context.random,
      ),
      pokemonPrompt(target, 'Which type is super effective against ', '?'),
    ),
    visual: { kind: 'type-matchup', multiplier: 2 },
  };
};

export const buildCounterPickQuestion: QuestionBuilder = (context) => {
  const fresh = context.pool.filter(({ name }) => !context.used.has(name));
  const repeated = context.pool.filter(({ name }) => context.used.has(name));
  const targets = [
    ...shuffle(fresh, context.random),
    ...shuffle(repeated, context.random),
  ];

  for (const target of targets) {
    if (!target.pokemon.sprite) continue;
    const candidates = context.pool.filter(
      ({ name, pokemon }) => name !== target.name && Boolean(pokemon.sprite),
    );
    const counters = candidates.filter(({ pokemon }) =>
      hasDoubleTypeAdvantage(
        context.catalog,
        pokemon.types,
        target.pokemon.types,
      ),
    );
    const distractors = candidates.filter(
      ({ pokemon }) =>
        !hasTypeAdvantage(context.catalog, pokemon.types, target.pokemon.types),
    );
    if (counters.length === 0 || distractors.length < 3) continue;
    const correct = pick(counters, context.random);
    if (!correct) continue;
    const options = pokemonOptions(context, correct, [], distractors);
    context.used.add(target.name);

    return {
      ...makeQuestion(
        'matchup',
        target,
        correct.name,
        options,
        pokemonPrompt(target, 'Who can hit ', ' super effectively?'),
        { kind: 'pixel-sprite', src: target.pokemon.sprite },
      ),
      optionVisuals: getOptionVisuals(context, options),
      title: 'Counter pick',
      visual: { kind: 'counter-pick', multiplier: 2 },
    };
  }

  return undefined;
};
