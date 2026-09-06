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

const spriteUrl = (path: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/${path}`;

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
        color: { name: 'green' },
        is_legendary: resourceName(resource) === 'species-1',
        is_mythical: resourceName(resource) === 'species-2',
        evolution_chain: {
          url: `https://pokeapi.co/api/v2/evolution-chain/${resourceName(resource)}`,
        },
        evolves_from_species: null,
        flavor_text_entries: [
          {
            flavor_text: `${resourceName(resource)} old field notes.`,
            language: { name: 'en' },
          },
          {
            flavor_text: `${resourceName(resource)} new\u00adest field notes.`,
            language: { name: 'en' },
          },
        ],
        genera: [{ genus: 'Test Pokémon', language: { name: 'en' } }],
        shape: { name: 'quadruped' },
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
      resources.map((resource, index) => {
        const id = index + 1;
        return {
          abilities: [
            { slot: 1, ability: { name: 'run-away' }, is_hidden: false },
          ],
          id,
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
            back_default: spriteUrl(`pokemon/back/${id}.png`),
            front_default: spriteUrl(`pokemon/${id}.png`),
            front_shiny: spriteUrl(`pokemon/shiny/${id}.png`),
            other: {
              dream_world: {
                front_default: spriteUrl(`pokemon/other/dream-world/${id}.svg`),
              },
              home: {
                front_default: spriteUrl(`pokemon/other/home/${id}.png`),
              },
              'official-artwork': {
                front_default: spriteUrl(
                  `pokemon/other/official-artwork/${id}.png`,
                ),
              },
              showdown: {
                back_default: spriteUrl(
                  `pokemon/other/showdown/back/${id}.gif`,
                ),
                front_default: spriteUrl(`pokemon/other/showdown/${id}.gif`),
              },
            },
            versions: {
              'generation-i': {
                icons: {
                  front_default: spriteUrl(
                    `pokemon/versions/generation-i/icons/${id}.png`,
                  ),
                },
                'red-blue': {
                  back_default: spriteUrl(
                    `pokemon/versions/generation-i/red-blue/back/${id}.png`,
                  ),
                  front_default: spriteUrl(
                    `pokemon/versions/generation-i/red-blue/${id}.png`,
                  ),
                },
                yellow: {
                  back_default: spriteUrl(
                    `pokemon/versions/generation-i/yellow/back/${id}.png`,
                  ),
                  front_default: spriteUrl(
                    `pokemon/versions/generation-i/yellow/${id}.png`,
                  ),
                },
              },
              'generation-ii': {
                crystal: {
                  back_default: null,
                  front_default: spriteUrl(
                    `pokemon/versions/generation-ii/crystal/${id}.png`,
                  ),
                },
              },
              'generation-iii': {
                'firered-leafgreen': {
                  back_default: null,
                  front_default: null,
                },
              },
              'generation-iv': {
                platinum: {
                  back_default: null,
                  front_default: null,
                },
              },
            },
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
        };
      }) as never,
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
      color: 'green',
      description: 'species-1 newest field notes.',
      generation: 'I',
      genus: 'Test',
      identitySprites: {
        generations: [
          {
            back: ['red-blue', 'yellow'],
            front: ['red-blue', 'yellow'],
            generation: 'I',
          },
          {
            back: [],
            front: ['crystal'],
            generation: 'II',
          },
        ],
      },
      isLegendary: true,
      isMythical: false,
      levelMoves: ['tackle'],
      shape: 'quadruped',
      shinySprite: '/sprites/pokemon/shiny/1.png',
      sprite: '/sprites/pokemon/1.png',
      types: ['normal'],
    });
    expect(catalog.pokemon['species-2']).toMatchObject({
      isLegendary: false,
      isMythical: true,
    });
    expect(catalog.pokemon['species-3']).toMatchObject({
      isLegendary: false,
      isMythical: false,
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
