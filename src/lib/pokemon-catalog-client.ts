import { parsePokemonCatalog } from '@/domain/pokemon/catalog';

import catalogUrl from 'virtual:pokemon-catalog-url';

import type { PokemonCatalog } from '@/domain/pokemon/types';
import { queryOptions } from '@tanstack/react-query';
import { queryClient } from './query-client';

export const pokemonCatalogQuery = queryOptions({
  queryKey: ['pokemon-catalog', catalogUrl],
  queryFn: fetchPokemonCatalog,
  staleTime: Infinity,
  gcTime: Infinity,
});

export const loadPokemonCatalog = () =>
  queryClient.fetchQuery(pokemonCatalogQuery);

async function fetchPokemonCatalog(): Promise<PokemonCatalog> {
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
}
