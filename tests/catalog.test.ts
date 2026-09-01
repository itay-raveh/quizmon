import { fetchPokemonCatalog, parsePokemonCatalog } from '@/game/catalog';

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
});
