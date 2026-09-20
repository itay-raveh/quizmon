import { parsePokemonCatalog } from '@/domain/pokemon/catalog';

import catalogUrl from 'virtual:pokemon-catalog-url';

import type { PokemonCatalog } from '@/domain/pokemon/types';

let catalogPromise: Promise<PokemonCatalog> | undefined;

export const loadPokemonCatalog = () =>
  (catalogPromise ??= fetchPokemonCatalog());

export const resetPokemonCatalog = () => {
  catalogPromise = undefined;
};

export const fetchPokemonCatalog = async (): Promise<PokemonCatalog> => {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`The Pokémon catalog request failed (${response.status}).`);
  }

  if (!response.body) throw new Error('The Pokémon catalog response is empty.');
  return parsePokemonCatalog(
    await new Response(
      response.body.pipeThrough(new DecompressionStream('gzip')),
    ).json(),
  );
};
