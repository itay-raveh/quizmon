import {
  formatRequirements,
  requirementsOf,
  type EvolutionDetail,
} from 'pokenode-ts';
import type { PokemonKnowledge } from '../src/domain/pokemon/types.ts';
import type {
  EvolutionCondition,
  EvolutionKnowledge,
} from '../src/domain/quiz/topic-catalog.ts';
import { clean } from './catalog-text.ts';

export const evolutionMethodConditions = (
  detail: EvolutionDetail,
  before: Pick<PokemonKnowledge, 'pokemonId' | 'speciesId'>,
  after: Pick<PokemonKnowledge, 'pokemonId' | 'speciesId'>,
  gameRegions: readonly string[],
): Pick<EvolutionKnowledge, 'conditions' | 'context'> => {
  const conditions: EvolutionCondition[] = [];
  let context: EvolutionKnowledge['context'];
  for (const requirement of requirementsOf(detail)) {
    if (
      requirement.kind === 'trigger' ||
      requirement.kind === 'required-form' ||
      requirement.kind === 'evolved-form'
    )
      continue;
    if (
      requirement.kind === 'region' &&
      gameRegions.length === 1 &&
      gameRegions[0] === requirement.region.name &&
      before.pokemonId === before.speciesId &&
      after.pokemonId === after.speciesId
    ) {
      context = { region: requirement.region.name };
      continue;
    }
    const text = clean(formatRequirements([requirement]));
    conditions.push(
      requirement.kind === 'region'
        ? { kind: requirement.kind, region: requirement.region.name, text }
        : requirement.kind === 'time-of-day'
          ? { kind: requirement.kind, time: requirement.time, text }
          : { kind: requirement.kind, text },
    );
  }
  return { conditions, ...(context ? { context } : {}) };
};
