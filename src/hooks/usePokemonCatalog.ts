import type { PokemonCatalog } from '@/domain/pokemon/types';
import {
  loadPokemonCatalog,
  resetPokemonCatalog,
} from '@/lib/pokemon-catalog-client';
import { useCallback, useEffect, useState } from 'react';

type CatalogState =
  | { status: 'loading'; catalog?: never }
  | { status: 'ready'; catalog: PokemonCatalog }
  | { status: 'error'; catalog?: never };

export const usePokemonCatalog = () => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    void loadPokemonCatalog()
      .then((catalog) => {
        if (active) setState({ status: 'ready', catalog });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    resetPokemonCatalog();
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
};
