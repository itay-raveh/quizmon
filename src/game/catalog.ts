import { useCallback, useEffect, useState } from 'react';
import type { PokemonCatalog } from './types';

type CatalogState =
  | { status: 'loading'; catalog?: never }
  | { status: 'ready'; catalog: PokemonCatalog }
  | { status: 'error'; catalog?: never };

let catalogPromise: Promise<PokemonCatalog> | undefined;

const loadCatalog = () => {
  catalogPromise ??= import('./data/pokemon.json').then(
    ({ default: catalog }) => catalog as PokemonCatalog,
  );
  return catalogPromise;
};

export const usePokemonCatalog = () => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    void loadCatalog()
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
    catalogPromise = undefined;
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
};
