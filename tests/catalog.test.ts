import { act, renderHook, waitFor } from '@testing-library/react';
import {
  fetchPokemonCatalog,
  parsePokemonCatalog,
  usePokemonCatalog,
} from '@/game/catalog';

const catalog = {
  contentVersion: 3,
  pokemon: { bulbasaur: {} },
  typeRelations: {},
};

describe('Pokémon catalog loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the generated catalog from its asset URL', async () => {
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(catalog),
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetch);

    await expect(fetchPokemonCatalog()).resolves.toEqual(catalog);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/pokemon.*\.json/),
    );
  });

  it('rejects unsuccessful catalog responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
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

  it('defers loading until the browser is idle', async () => {
    let runWhenIdle: IdleRequestCallback | undefined;
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(catalog),
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetch);
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: IdleRequestCallback) => {
        runWhenIdle = callback;
        return 1;
      }),
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    const { result, unmount } = renderHook(() => usePokemonCatalog());

    expect(result.current.status).toBe('loading');
    expect(fetch).not.toHaveBeenCalled();

    act(() => {
      runWhenIdle?.({ didTimeout: false, timeRemaining: () => 10 });
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetch).toHaveBeenCalledOnce();
    unmount();
  });
});
