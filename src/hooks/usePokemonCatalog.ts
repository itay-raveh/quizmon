import type { PokemonCatalog } from '@/domain/pokemon/types';
import { fetchPokemonCatalog } from '@/lib/pokemon-catalog-client';
import { useCallback, useEffect, useState } from 'react';

type CatalogState =
  | { status: 'loading'; catalog?: never }
  | { status: 'ready'; catalog: PokemonCatalog }
  | { status: 'error'; catalog?: never };

interface PokemonCatalogOptions {
  loadImmediately?: boolean;
}

let catalogPromise: Promise<PokemonCatalog> | undefined;

const loadCatalog = () => {
  catalogPromise ??= fetchPokemonCatalog();
  return catalogPromise;
};

const scheduleIdleCatalogLoad = (load: () => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(load, { timeout: 1500 });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(load, 0);
  return () => window.clearTimeout(timeoutId);
};

export const usePokemonCatalog = ({
  loadImmediately = false,
}: PokemonCatalogOptions = {}) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<CatalogState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    const load = () => {
      void loadCatalog()
        .then((catalog) => {
          if (active) setState({ status: 'ready', catalog });
        })
        .catch(() => {
          if (active) setState({ status: 'error' });
        });
    };

    let cancelScheduledLoad: (() => void) | undefined;
    if (loadImmediately || attempt > 0) load();
    else cancelScheduledLoad = scheduleIdleCatalogLoad(load);

    return () => {
      active = false;
      cancelScheduledLoad?.();
    };
  }, [attempt, loadImmediately]);

  const retry = useCallback(() => {
    catalogPromise = undefined;
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
};
