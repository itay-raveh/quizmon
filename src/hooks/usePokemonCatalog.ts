import type { PokemonCatalog } from '@/domain/pokemon/types';
import { pokemonCatalogQuery } from '@/lib/pokemon-catalog-client';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

type CatalogState =
  | { status: 'loading'; catalog?: never }
  | { status: 'ready'; catalog: PokemonCatalog }
  | { status: 'error'; catalog?: never };

export const usePokemonCatalog = () => {
  const query = useQuery(pokemonCatalogQuery);
  const refetch = query.refetch;
  const state: CatalogState = query.isSuccess
    ? { status: 'ready', catalog: query.data }
    : query.isError
      ? { status: 'error' }
      : { status: 'loading' };
  const retry = useCallback(() => void refetch(), [refetch]);
  return { ...state, retry };
};
