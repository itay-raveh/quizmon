import {
  buildPokemonCatalog,
  type CatalogClient,
} from '../scripts/update-pokemon-data.ts';
import type { PokemonCatalog } from '@/game/types';

describe('catalog generation', () => {
  it('rebuilds every default generation and preserves curated forms', async () => {
    const generationCalls: number[] = [];
    const concurrencyValues: number[] = [];
    const client: CatalogClient = {
      getGenerationById(id) {
        generationCalls.push(id);
        return Promise.resolve({
          pokemon_species: [
            { name: `species-${id}`, url: `https://example.test/${id}` },
          ],
        });
      },
      resolveAll(resources, options) {
        concurrencyValues.push(options.concurrency);
        return Promise.resolve(
          resources.map((resource) => ({
            varieties: [
              { is_default: false, pokemon: { name: 'alternate' } },
              {
                is_default: true,
                pokemon: { name: `${resource.name}-default` },
              },
            ],
          })),
        );
      },
    };
    const existing: PokemonCatalog = {
      'z-curated-mega': { formCategory: 'mega', generation: 'VI' },
      'stale-default': { formCategory: 'default', generation: 'I' },
    };

    const catalog = await buildPokemonCatalog(existing, client);

    expect(generationCalls).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(concurrencyValues).toEqual(Array(9).fill(4));
    expect(catalog['species-1-default']).toEqual({
      formCategory: 'default',
      generation: 'I',
    });
    expect(catalog['species-9-default']).toEqual({
      formCategory: 'default',
      generation: 'IX',
    });
    expect(catalog['z-curated-mega']).toEqual(existing['z-curated-mega']);
    expect(catalog['stale-default']).toBeUndefined();
    expect(Object.keys(catalog)).toEqual([...Object.keys(catalog)].sort());
  });

  it('fails rather than silently omitting a species without a default', async () => {
    const client: CatalogClient = {
      getGenerationById(id) {
        return Promise.resolve({
          pokemon_species: [
            { name: `species-${id}`, url: `https://example.test/${id}` },
          ],
        });
      },
      resolveAll() {
        return Promise.resolve([{ varieties: [] }]);
      },
    };

    await expect(buildPokemonCatalog({}, client)).rejects.toThrow(
      'Pokémon species has no default variety',
    );
  });
});
