import {
  buildPokemonCatalog,
  type CatalogClient,
} from '../scripts/update-pokemon-data.ts';
import type { ResourceLink } from 'pokenode-ts';

const resourceUrl = <T>(resource: ResourceLink<T>) =>
  typeof resource === 'string' ? resource : resource.url;

const resourceName = <T>(resource: ResourceLink<T>) =>
  typeof resource !== 'string' && 'name' in resource
    ? resource.name
    : (resourceUrl(resource).split('/').filter(Boolean).at(-1) ?? '');

const makeClient = (): CatalogClient => ({
  getGenerationById(id) {
    return Promise.resolve({
      pokemon_species: [
        {
          name: `species-${id}`,
          url: `https://pokeapi.co/api/v2/pokemon-species/${id}`,
        },
      ],
    } as never);
  },
  resolveSpecies(resources) {
    return Promise.resolve(
      resources.map((resource) => ({
        name: resourceName(resource),
        evolution_chain: {
          url: `https://pokeapi.co/api/v2/evolution-chain/${resourceName(resource)}`,
        },
        evolves_from_species: null,
        flavor_text_entries: [
          {
            flavor_text: `${resourceName(resource)} field notes.`,
            language: { name: 'en' },
          },
        ],
        genera: [{ genus: 'Test Pokémon', language: { name: 'en' } }],
        varieties: [
          {
            is_default: true,
            pokemon: {
              name: resourceName(resource),
              url: `https://pokeapi.co/api/v2/pokemon/${resourceName(resource)}`,
            },
          },
        ],
      })) as never,
    );
  },
  resolvePokemon(resources) {
    return Promise.resolve(
      resources.map((resource, index) => ({
        abilities: [
          { slot: 1, ability: { name: 'run-away' }, is_hidden: false },
        ],
        height: index + 1,
        id: index + 1,
        moves: [
          {
            move: { name: 'tackle' },
            version_group_details: [
              { move_learn_method: { name: 'level-up' } },
            ],
          },
        ],
        name: resourceName(resource),
        species: { name: resourceName(resource) },
        sprites: {
          front_default: 'https://example.test/sprite.png',
          other: {},
        },
        stats: [
          { base_stat: 50, stat: { name: 'hp' } },
          { base_stat: 50, stat: { name: 'attack' } },
          { base_stat: 50, stat: { name: 'defense' } },
          { base_stat: 50, stat: { name: 'special-attack' } },
          { base_stat: 50, stat: { name: 'special-defense' } },
          { base_stat: 50, stat: { name: 'speed' } },
        ],
        types: [{ slot: 1, type: { name: 'normal', url: '/type/1' } }],
        weight: (index + 1) * 10,
      })) as never,
    );
  },
  resolveEvolutionChains(resources) {
    return Promise.resolve(
      resources.map((resource, index) => ({
        id: index + 1,
        baby_trigger_item: null,
        chain: {
          is_baby: false,
          species: {
            name: resourceName(resource),
          },
          evolution_details: [],
          evolves_to: [],
        },
      })) as never,
    );
  },
  resolveTypes() {
    return Promise.resolve([
      {
        name: 'normal',
        damage_relations: {
          double_damage_to: [],
          half_damage_to: [],
          no_damage_to: [],
        },
      },
    ] as never);
  },
});

describe('catalog generation', () => {
  it('normalizes every generation into one versioned knowledge catalog', async () => {
    const catalog = await buildPokemonCatalog(makeClient());

    expect(Object.keys(catalog.pokemon)).toHaveLength(9);
    expect(catalog.pokemon['species-1']).toMatchObject({
      abilities: ['run-away'],
      description: 'species-1 field notes.',
      generation: 'I',
      genus: 'Test',
      height: 1,
      levelMoves: ['tackle'],
      types: ['normal'],
      weight: 10,
    });
    expect(catalog.pokemon['species-9']?.generation).toBe('IX');
    expect(catalog.typeRelations.normal).toEqual({
      doubleTo: [],
      halfTo: [],
      noneTo: [],
    });
  });

  it('fails rather than silently omitting a species without a default', async () => {
    const client = makeClient();
    client.resolveSpecies = (resources) =>
      Promise.resolve(
        resources.map((resource) => ({
          name: resourceName(resource),
          varieties: [],
        })) as never,
      );

    await expect(buildPokemonCatalog(client)).rejects.toThrow(
      'has no default Pokémon variety',
    );
  });
});
