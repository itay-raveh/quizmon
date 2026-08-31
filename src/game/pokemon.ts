import type { Pokemon, PokemonClient, PokemonSprites } from 'pokenode-ts';
import { useCallback, useEffect, useState } from 'react';

export type { Pokemon, PokemonSprites };

type PokemonState =
  | { status: 'loading'; pokemon?: never; error?: never }
  | { status: 'ready'; pokemon: Pokemon; error?: never }
  | { status: 'error'; pokemon?: never; error: string };

let pokemonClientPromise: Promise<PokemonClient> | undefined;

const getPokemonClient = () => {
  pokemonClientPromise ??= import('pokenode-ts').then(
    ({ PokemonClient }) => new PokemonClient(),
  );
  return pokemonClientPromise;
};

export const usePokemon = (name: string) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PokemonState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    void getPokemonClient()
      .then((client) => client.getPokemonByName(name))
      .then((pokemon) => {
        if (!active) return;
        setState({ status: 'ready', pokemon });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : 'Request failed';
        setState({ status: 'error', error: message });
      });

    return () => {
      active = false;
    };
  }, [attempt, name]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, []);

  return { ...state, retry };
};
