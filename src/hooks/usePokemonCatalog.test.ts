import { act, renderHook, waitFor } from '@testing-library/react';
import { gzipSync } from 'node:zlib';
import { parsePokemonCatalog } from '../domain/pokemon/catalog';
import {
  fetchPokemonCatalog,
  loadPokemonCatalog,
  resetPokemonCatalog,
} from '../lib/pokemon-catalog-client';
import { usePokemonCatalog } from './usePokemonCatalog';

const catalog = {
  contentVersion: 3,
  pokemon: { bulbasaur: {} },
  typeRelations: {},
};

describe('Pokémon catalog loading', () => {
  beforeEach(resetPokemonCatalog);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the generated catalog from its asset URL', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(Uint8Array.from(gzipSync(JSON.stringify(catalog)))),
        ),
      );
    vi.stubGlobal('fetch', fetch);

    await expect(fetchPokemonCatalog()).resolves.toEqual(catalog);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/pokemon-catalog.*\.bin/),
    );
  });

  it('rejects unsuccessful catalog responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    await expect(fetchPokemonCatalog()).rejects.toThrow(
      'The Pokémon catalog request failed (503).',
    );
  });

  it('rejects malformed catalog data', () => {
    expect(() => parsePokemonCatalog({ contentVersion: 3 })).toThrow(
      'The Pokémon catalog has an invalid structure.',
    );
  });

  it('starts immediately and shares the startup preload with the mounted game', async () => {
    const pending = Promise.withResolvers<Response>();
    const fetch = vi.fn().mockReturnValue(pending.promise);
    vi.stubGlobal('fetch', fetch);
    const idle = vi.fn();
    vi.stubGlobal('requestIdleCallback', idle);
    const preload = loadPokemonCatalog();
    const { result, unmount } = renderHook(() => usePokemonCatalog());

    expect(result.current.status).toBe('loading');
    expect(fetch).toHaveBeenCalledOnce();
    expect(idle).not.toHaveBeenCalled();
    expect(loadPokemonCatalog()).toBe(preload);
    await act(async () => {
      pending.resolve(
        new Response(Uint8Array.from(gzipSync(JSON.stringify(catalog)))),
      );
      await preload;
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledOnce();
    unmount();
  });

  it('retries a failed preload without keeping its rejected promise', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Offline'))
      .mockImplementation(() =>
        Promise.resolve(
          new Response(Uint8Array.from(gzipSync(JSON.stringify(catalog)))),
        ),
      );
    vi.stubGlobal('fetch', fetch);
    await expect(loadPokemonCatalog()).rejects.toThrow('Offline');
    const { result } = renderHook(() => usePokemonCatalog());
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects a damaged catalog archive', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not gzip')));
    await expect(fetchPokemonCatalog()).rejects.toThrow();
  });
});
