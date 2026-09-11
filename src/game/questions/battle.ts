import { formatTypeMultiplier } from '../format';
import { pick, shuffle } from '../random';
import { attackMultiplier } from '../type-effectiveness';
import type { PokemonCatalog } from '../types';
import { pokemonOptions, rankedOptionSet } from './answers';
import { makeQuestion, targetMedia } from './assembly';
import { type Candidate, type QuestionBuilder } from './context';
import { pokemonPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { orderTargets, pickFreshTarget } from './selection';

const matchupMultipliers = [4, 2, 0.5, 0.25] as const;

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

    return {
      ...makeQuestion(context, {
        repeat: targetRepetition({
          pokemonOptions: false,
          variant: [String(multiplier)],
        }),
        category: 'matchup',
        target,
        correct,
        options: rankedOptionSet(
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
        prompt: pokemonPrompt(
          target,
          `Which type has a ×${formatTypeMultiplier(multiplier)} matchup against `,
          '?',
        ),
        presentation: { kind: 'text' },
        media: targetMedia(target),
      }),
      visual: { kind: 'type-matchup', multiplier },
    };
  }

  return undefined;
};

export const buildCounterPickQuestion: QuestionBuilder = (context) => {
  const targets = orderTargets(context, context.pool);

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
      const correct = pickFreshTarget(context, counters);
      if (!correct) continue;
      const options = pokemonOptions(context, {
        correct,
        candidates: distractors,
      });

      return {
        ...makeQuestion(context, {
          repeat: targetRepetition({
            pokemonOptions: true,
            variant: [String(multiplier)],
          }),
          category: 'matchup',
          target,
          correct: correct.name,
          options,
          prompt: pokemonPrompt(
            target,
            `Whose strongest attack type has a ×${formatTypeMultiplier(multiplier)} matchup against `,
            '?',
          ),
          media: { kind: 'pixel-sprite', src: targetSprite },
          presentation: { kind: 'pokemon-sprites' },
        }),
        visual: { kind: 'counter-pick', multiplier },
      };
    }
  }

  return undefined;
};
