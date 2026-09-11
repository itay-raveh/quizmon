import { parsePokemonCatalog } from '../domain/pokemon/catalog';

import catalogUrl from '../domain/pokemon/data/pokemon.json?url';

import type { PokemonCatalog } from '@/domain/pokemon/types';

export const fetchPokemonCatalog = async (): Promise<PokemonCatalog> => {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`The Pokémon catalog request failed (${response.status}).`);
  }

  return parsePokemonCatalog(await response.json());
};
