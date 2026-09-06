import { shuffle } from '../random';
import { formatTypeMultiplier } from '../format';
import type { PokemonCatalog } from '../types';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pokemonOptions,
  pokemonPrompt,
  rankedOptionSet,
  type QuestionBuilder,
} from './shared';

const matchupMultipliers = [4, 2, 0.5, 0.25] as const;

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

const hasExactMatchup = (
  catalog: PokemonCatalog,
  attackerTypes: readonly string[],
  defenderTypes: readonly string[],
  multiplier: number,
): boolean =>
  attackerTypes.some(
    (type) => attackMultiplier(catalog, type, defenderTypes) === multiplier,
  );

export const buildMatchupQuestion: QuestionBuilder = (context) => {
  const attackTypes = Object.keys(context.catalog.typeRelations);
  for (const multiplier of shuffle(matchupMultipliers, context.random)) {
    const targets = context.pool.filter(({ pokemon }) =>
      attackTypes.some(
        (type) =>
          attackMultiplier(context.catalog, type, pokemon.types) === multiplier,
      ),
    );
    const fresh = targets.filter(({ name }) => !context.used.has(name));
    const target = pick(fresh.length > 0 ? fresh : targets, context.random);
    if (!target) continue;
    const matchingTypes = attackTypes.filter(
      (type) =>
        attackMultiplier(context.catalog, type, target.pokemon.types) ===
        multiplier,
    );
    const correct = pick(matchingTypes, context.random);
    if (!correct) continue;
    const distractors = attackTypes.filter(
      (type) =>
        type !== correct &&
        attackMultiplier(context.catalog, type, target.pokemon.types) !==
          multiplier,
    );
    if (distractors.length < 3) continue;
    context.used.add(target.name);

    return {
      ...makeQuestion(
        'matchup',
        target,
        correct,
        rankedOptionSet(
          correct,
          distractors,
          (type) => {
            const candidateMultiplier = attackMultiplier(
              context.catalog,
              type,
              target.pokemon.types,
            );
            if (candidateMultiplier === 0) return -8;
            return -Math.abs(
              Math.log2(candidateMultiplier) - Math.log2(multiplier),
            );
          },
          context.random,
        ),
        pokemonPrompt(
          target,
          `Which type has a ×${formatTypeMultiplier(multiplier)} matchup against `,
          '?',
        ),
      ),
      visual: { kind: 'type-matchup', multiplier },
    };
  }

  return undefined;
};

export const buildCounterPickQuestion: QuestionBuilder = (context) => {
  const fresh = context.pool.filter(({ name }) => !context.used.has(name));
  const repeated = context.pool.filter(({ name }) => context.used.has(name));
  const targets = [
    ...shuffle(fresh, context.random),
    ...shuffle(repeated, context.random),
  ];

  for (const multiplier of shuffle(matchupMultipliers, context.random)) {
    for (const target of targets) {
      const targetSprite = target.pokemon.sprite;
      if (!targetSprite) continue;
      const candidates = context.pool.filter(
        ({ name, pokemon }) => name !== target.name && Boolean(pokemon.sprite),
      );
      const counters = candidates.filter(({ pokemon }) =>
        hasExactMatchup(
          context.catalog,
          pokemon.types,
          target.pokemon.types,
          multiplier,
        ),
      );
      const distractors = candidates.filter(
        ({ pokemon }) =>
          !hasExactMatchup(
            context.catalog,
            pokemon.types,
            target.pokemon.types,
            multiplier,
          ),
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
          pokemonPrompt(
            target,
            `Who has a ×${formatTypeMultiplier(multiplier)} type matchup against `,
            '?',
          ),
          { kind: 'pixel-sprite', src: targetSprite },
        ),
        optionVisuals: getOptionVisuals(context, options),
        title: 'Counter pick',
        visual: { kind: 'counter-pick', multiplier },
      };
    }
  }

  return undefined;
};
