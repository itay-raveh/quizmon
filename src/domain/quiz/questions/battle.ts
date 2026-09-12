import { pick, shuffle } from '../../../lib/random';
import { formatTypeMultiplier } from '../../pokemon/format';
import { attackMultiplier } from '../../pokemon/type-effectiveness';
import type { PokemonCatalog } from '../../pokemon/types';
import { pokemonOptions, rankedOptionSet } from './answers';
import { makeQuestion, targetMedia } from './assembly';
import { type Candidate, type QuestionBuilder } from './context';
import { pokemonPrompt } from './prompts';
import { targetRepetition } from './repetition';
import { pickForm } from './sampling';
import { orderSpecies, pickFreshTarget } from './selection';

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
  for (const multiplier of shuffle(
    context.variant?.multipliers ?? matchupMultipliers,
    context.random,
  )) {
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
  const pool = context.pool.filter(({ pokemon }) => pokemon.sprite);
  const typeKey = (types: readonly string[]) => [...types].sort().join(',');
  const typeGroups = new Map<string, { types: string[]; count: number }>();
  for (const { pokemon } of pool) {
    const key = typeKey(pokemon.types);
    const group = typeGroups.get(key) ?? { types: pokemon.types, count: 0 };
    group.count++;
    typeGroups.set(key, group);
  }

  for (const multiplier of shuffle(
    context.variant?.multipliers ?? matchupMultipliers,
    context.random,
  )) {
    const eligibleTypes = new Set<string>();
    for (const [key, defender] of typeGroups) {
      const matches = createMatchupChecker(context.catalog, defender.types);
      const counters = [...typeGroups.values()].reduce(
        (count, attacker) =>
          count + (matches(attacker.types, multiplier) ? attacker.count : 0),
        0,
      );
      const selfMatches = Number(matches(defender.types, multiplier));
      if (
        counters - selfMatches > 0 &&
        pool.length - counters - (1 - selfMatches) >= 3
      )
        eligibleTypes.add(key);
    }
    const eligible = pool.filter(({ pokemon }) =>
      eligibleTypes.has(typeKey(pokemon.types)),
    );
    for (const forms of orderSpecies(context, eligible)) {
      const target = pickForm(forms, context.random)!;
      const targetSprite = target.pokemon.sprite!;
      const hasExactMatchup = createMatchupChecker(
        context.catalog,
        target.pokemon.types,
      );
      const counters: Candidate[] = [];
      const distractors: Candidate[] = [];
      for (const candidate of pool) {
        if (candidate.name === target.name) continue;
        (hasExactMatchup(candidate.pokemon.types, multiplier)
          ? counters
          : distractors
        ).push(candidate);
      }
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
