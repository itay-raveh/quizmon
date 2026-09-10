import { pick, shuffle } from '../random';

type PokemonChoice = string | { name: string };

const pokemonWeights = {
  ordinary: 4,
  regional: 2,
  transformation: 1,
} as const;

export const pokemonWeight = (name: string): number => {
  if (/-(mega(?:-[xyz])?|gmax)$/.test(name))
    return pokemonWeights.transformation;
  if (/-(alola|galar|hisui|paldea)(?:-|$)/.test(name))
    return pokemonWeights.regional;
  return pokemonWeights.ordinary;
};

const pokemonTickets = <T extends PokemonChoice>(
  candidates: readonly T[],
): T[] =>
  candidates.flatMap((candidate) =>
    Array<T>(
      pokemonWeight(typeof candidate === 'string' ? candidate : candidate.name),
    ).fill(candidate),
  );

export const pickPokemon = <T extends PokemonChoice>(
  candidates: readonly T[],
  random: () => number,
): T | undefined => pick(pokemonTickets(candidates), random);

export const shufflePokemon = <T extends PokemonChoice>(
  candidates: readonly T[],
  random: () => number,
): T[] => [...new Set(shuffle(pokemonTickets(candidates), random))];
