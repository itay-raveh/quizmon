import { useCallback, useEffect, useState } from 'react';
import catalogUrl from './data/pokemon.json?url';
import type { PokemonCatalog } from './types';
import { isRecord } from './validation';

type CatalogState =
  | { status: 'loading'; catalog?: never }
  | { status: 'ready'; catalog: PokemonCatalog }
  | { status: 'error'; catalog?: never };

interface PokemonCatalogOptions {
  loadImmediately?: boolean;
}

let catalogPromise: Promise<PokemonCatalog> | undefined;

export const parsePokemonCatalog = (value: unknown): PokemonCatalog => {
  if (
    !isRecord(value) ||
    typeof value.contentVersion !== 'number' ||
    !isRecord(value.pokemon) ||
    Object.keys(value.pokemon).length === 0 ||
    !isRecord(value.typeRelations)
  ) {
    throw new Error('The Pokémon catalog has an invalid structure.');
  }

  return value as unknown as PokemonCatalog;
};

export const fetchPokemonCatalog = async (): Promise<PokemonCatalog> => {
  const response = await fetch(catalogUrl);
  if (!response.ok) {
    throw new Error(`The Pokémon catalog request failed (${response.status}).`);
  }

  return parsePokemonCatalog(await response.json());
};

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

    let cancelScheduledLoad: () => void = () => undefined;
    if (loadImmediately || attempt > 0) load();
    else cancelScheduledLoad = scheduleIdleCatalogLoad(load);

    return () => {
      active = false;
      cancelScheduledLoad();
    };
  }, [attempt, loadImmediately]);

  const retry = useCallback(() => {
    catalogPromise = undefined;
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
};
