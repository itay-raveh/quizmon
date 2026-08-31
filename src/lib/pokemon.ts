import { useCallback, useEffect, useState } from 'react';

export interface PokemonSprites {
  front_default?: string | null;
  other?: {
    home?: { front_default?: string | null };
    'official-artwork'?: { front_default?: string | null };
    [key: string]: unknown;
  };
  versions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Pokemon {
  name: string;
  sprites: PokemonSprites;
}

type PokemonState =
  | { status: 'loading'; pokemon?: never; error?: never }
  | { status: 'ready'; pokemon: Pokemon; error?: never }
  | { status: 'error'; pokemon?: never; error: string };

const cache = new Map<string, Pokemon>();

const isPokemon = (value: unknown): value is Pokemon => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<Pokemon>;
  return (
    typeof candidate.name === 'string' &&
    Boolean(candidate.sprites) &&
    typeof candidate.sprites === 'object'
  );
};

export const usePokemon = (name: string) => {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PokemonState>(() => {
    const cached = cache.get(name);
    return cached
      ? { status: 'ready', pokemon: cached }
      : { status: 'loading' };
  });

  useEffect(() => {
    const cached = cache.get(name);
    if (cached) return;

    const controller = new AbortController();

    void fetch(
      `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(name)}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`PokéAPI returned ${response.status}`);
        const payload: unknown = await response.json();
        if (!isPokemon(payload))
          throw new Error('PokéAPI returned invalid data');
        cache.set(name, payload);
        setState({ status: 'ready', pokemon: payload });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : 'Request failed';
        setState({ status: 'error', error: message });
      });

    return () => controller.abort();
  }, [attempt, name]);

  const retry = useCallback(() => {
    cache.delete(name);
    setState({ status: 'loading' });
    setAttempt((current) => current + 1);
  }, [name]);

  return { ...state, retry };
};
