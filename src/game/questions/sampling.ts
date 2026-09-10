import { pick, shuffle } from '../random';

type PokemonChoice = string | { name: string };

export const pokemonWeight = (name: string): number => {
  if (/-(mega(?:-[xyz])?|gmax)$/.test(name)) return 0.25;
  if (/-(alola|galar|hisui|paldea)(?:-|$)/.test(name)) return 0.5;
  return 1;
};

const pokemonTickets = <T extends PokemonChoice>(
  candidates: readonly T[],
): T[] =>
  candidates.flatMap((candidate) =>
    Array<T>(
      4 *
        pokemonWeight(
          typeof candidate === 'string' ? candidate : candidate.name,
        ),
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
