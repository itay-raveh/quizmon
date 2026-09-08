import { questionLabels } from '../question-labels';
import { shuffle } from '../random';
import { formatTypeMultiplier } from '../format';
import type { PokemonCatalog } from '../types';
import {
  getOptionVisuals,
  makeQuestion,
  pick,
  pickFreshTarget,
  pokemonOptions,
  pokemonPrompt,
  rankedOptionSet,
  type Candidate,
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

const createMatchupChecker = (
  catalog: PokemonCatalog,
  defenderTypes: readonly string[],
) => {
  const multipliers = new Map(
    Object.keys(catalog.typeRelations).map((type) => [
      type,
      attackMultiplier(catalog, type, defenderTypes),
    ]),
  );
  return (attackerTypes: readonly string[], multiplier: number): boolean =>
    Math.max(...attackerTypes.map((type) => multipliers.get(type) ?? 1)) ===
    multiplier;
};

export const buildMatchupQuestion: QuestionBuilder = (context) => {
  const attackTypes = Object.keys(context.catalog.typeRelations);
  for (const multiplier of shuffle(matchupMultipliers, context.random)) {
    const targets = context.pool.filter(({ pokemon }) =>
      attackTypes.some(
        (type) =>
          attackMultiplier(context.catalog, type, pokemon.types) === multiplier,
      ),
    );
    const target = pickFreshTarget(context, targets);
    if (!target) continue;
    const matchingTypes = attackTypes.filter(
      (type) =>
        attackMultiplier(context.catalog, type, target.pokemon.types) ===
        multiplier,
    );
    const correct = pick(matchingTypes, context.random);
    if (!correct) continue;
    const distractors = attackTypes.filter(
      (type) => !matchingTypes.includes(type),
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
      const hasExactMatchup = createMatchupChecker(
        context.catalog,
        target.pokemon.types,
      );
      const counters: Candidate[] = [];
      const distractors: Candidate[] = [];
      context.pool.forEach((candidate) => {
        const { name, pokemon } = candidate;
        if (name === target.name || !pokemon.sprite) return;
        const matches = hasExactMatchup(pokemon.types, multiplier);
        (matches ? counters : distractors).push(candidate);
      });
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
            `Whose strongest attack type has a ×${formatTypeMultiplier(multiplier)} matchup against `,
            '?',
          ),
          { kind: 'pixel-sprite', src: targetSprite },
        ),
        optionVisuals: getOptionVisuals(context, options),
        title: questionLabels['counter-pick'],
        visual: { kind: 'counter-pick', multiplier },
      };
    }
  }

  return undefined;
};
