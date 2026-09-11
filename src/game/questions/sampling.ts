import { getFormGroup } from '../forms';
import { pick } from '../random';
import type { Candidate } from './context';

const pokemonWeights = {
  ordinary: 4,
  regional: 2,
  transformation: 1,
} as const;

export const pokemonWeight = (name: string): number => {
  const group = getFormGroup(name);
  if (group === 'mega' || group === 'gigantamax')
    return pokemonWeights.transformation;
  return group === 'regional'
    ? pokemonWeights.regional
    : pokemonWeights.ordinary;
};

export const groupPokemon = (
  candidates: readonly Candidate[],
): Candidate[][] => {
  const species = new Map<number, Candidate[]>();
  for (const candidate of candidates) {
    const id = candidate.pokemon.speciesId;
    const forms = species.get(id) ?? [];
    forms.push(candidate);
    species.set(id, forms);
  }
  return [...species.values()];
};

export const speciesWeight = (forms: readonly Candidate[]): number =>
  forms.reduce((weight, { name }) => Math.max(weight, pokemonWeight(name)), 0);

export const pickForm = (
  candidates: readonly Candidate[],
  random: () => number,
): Candidate | undefined => {
  const categories = new Map<number, Candidate[]>();
  for (const candidate of candidates) {
    const weight = pokemonWeight(candidate.name);
    const forms = categories.get(weight) ?? [];
    forms.push(candidate);
    categories.set(weight, forms);
  }
  const tickets = [...categories].flatMap(([weight, forms]) =>
    Array<Candidate[]>(weight).fill(forms),
  );
  const forms = pick(tickets, random);
  return forms ? pick(forms, random) : undefined;
};
