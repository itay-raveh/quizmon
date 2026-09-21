import type { Pokemon, ResourceLink } from 'pokenode-ts';
import {
  buildPokemonCatalog,
  type CatalogClient,
} from '../scripts/update-pokemon-data.ts';

const resourceUrl = <T>(resource: ResourceLink<T>) =>
  typeof resource === 'string' ? resource : resource.url;

const resourceName = <T>(resource: ResourceLink<T>) =>
  typeof resource !== 'string' && 'name' in resource
    ? resource.name
    : (resourceUrl(resource).split('/').filter(Boolean).at(-1) ?? '');

const spriteUrl = (path: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/${path}`;

const makeClient = () => {
  const fixtures: Record<
    string,
    (
      resources: readonly ResourceLink<unknown>[],
    ) => Promise<Record<string, unknown>[]>
  > = {
    'pokemon-species'(resources) {
      return Promise.resolve(
        resources.map((resource) => {
          const name = resourceName(resource);
          return {
            name,
            id: Number(name.split('-').at(-1)),
            names: [],
            color: { name: 'green' },
            is_legendary: name === 'species-1',
            is_mythical: name === 'species-2',
            evolution_chain: {
              url: `https://pokeapi.co/api/v2/evolution-chain/${name.split('-').at(-1)}/`,
            },
            evolves_from_species: null,
            flavor_text_entries: [
              {
                flavor_text: `${name} old field notes.`,
                version: { name: 'red' },
                language: { name: 'en' },
              },
              {
                flavor_text: `${name}\tnew\u00adest\nfield\fnotes.`,
                version: { name: 'violet' },
                language: { name: 'en' },
              },
              { flavor_text: 'Ignored entry.', language: { name: 'EN' } },
              { flavor_text: 'Ignored entry.', language: { name: 'ja' } },
            ],
            genera: [{ genus: 'Test\nPokémon', language: { name: 'en' } }],
            shape: { name: 'quadruped' },
            varieties: [
              {
                is_default: true,
                pokemon: {
                  name,
                  url: `https://pokeapi.co/api/v2/pokemon/${name}`,
                },
              },
            ],
          };
        }),
      );
    },
    pokemon(resources) {
      return Promise.resolve(
        resources.map((resource, index) => {
          const id = index + 1;
          return {
            abilities: [
              { slot: 1, ability: { name: 'run-away' }, is_hidden: false },
            ],
            id,
            is_default: true,
            forms: [
              {
                name: resourceName(resource),
                url: `https://pokeapi.co/api/v2/pokemon-form/${id}/`,
              },
            ],
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
                  front_default: spriteUrl(
                    `pokemon/other/dream-world/${id}.svg`,
                  ),
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
              { base_stat: 75, stat: { name: 'hp' } },
            ],
            types: [{ slot: 1, type: { name: 'normal', url: '/type/1' } }],
          };
        }),
      );
    },
    async 'pokemon-form'(resources) {
      const pokemon = (await fixtures.pokemon!(
        resources.map((resource) => ({
          name: resourceName(resource),
          url: resourceUrl(resource),
        })),
      )) as Pick<Pokemon, 'id' | 'name' | 'types' | 'sprites'>[];
      return pokemon.map((entry) => ({
        id: entry.id,
        name: entry.name,
        is_default: true,
        form_name: '',
        names: [],
        form_names: [],
        pokemon: { name: entry.name, url: '' },
        types: entry.types,
        sprites: { ...entry.sprites, versions: {} },
        version_group: {
          name: `group-${entry.id}`,
          url: `/version-group/${entry.id}/`,
        },
      }));
    },
    'version-group'(resources) {
      return Promise.resolve(
        resources.map((resource, index) => ({
          name: resourceName(resource),
          generation: {
            name: `generation-${['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'][index]}`,
          },
          versions: [],
        })),
      );
    },
    'evolution-chain'(resources) {
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
        })),
      );
    },
    type() {
      return Promise.resolve([
        {
          name: 'normal',
          damage_relations: {
            double_damage_to: [],
            half_damage_to: [],
            no_damage_to: [],
          },
        },
      ]);
    },
  };
  const client: CatalogClient = {
    measureSprites: (paths) =>
      Promise.resolve(
        new Map(
          paths.map((path) => [
            path,
            {
              area: 0.25,
              width: 0.5,
              height: 0.5,
              centerX: 0.5,
              bottom: 0.75,
              pixelPeekFocus: '100000000000000000000',
            },
          ]),
        ),
      ),
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

    async resolveAll<T>(resources: readonly ResourceLink<T>[]) {
      if (!resources.length) return [];
      const endpoint = resourceUrl(resources[0]!)
        .split('/')
        .filter(Boolean)
        .at(-2)!;
      const resolve = fixtures[endpoint];
      if (!resolve) throw new Error(`Unexpected fixture endpoint: ${endpoint}`);
      return (await resolve(resources)) as T[];
    },
  };
  return { ...client, fixtures };
};

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
            back: [
              '/sprites/pokemon/versions/generation-i/red-blue/back/1.png',
              '/sprites/pokemon/versions/generation-i/yellow/back/1.png',
            ],
            front: [
              '/sprites/pokemon/versions/generation-i/red-blue/1.png',
              '/sprites/pokemon/versions/generation-i/yellow/1.png',
            ],
            generation: 'I',
          },
          {
            back: [],
            front: ['/sprites/pokemon/versions/generation-ii/crystal/1.png'],
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
      spriteMeasurements: [0.25, 0.5, 0.5, 0.5, 0.75],
      pixelPeekFocus: '100000000000000000000',
      stats: {
        hp: 75,
        attack: 50,
        defense: 50,
        'special-attack': 50,
        'special-defense': 50,
        speed: 0,
      },
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
    client.fixtures['pokemon-species'] = (resources) =>
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

  it('rejects Pokémon whose species metadata is missing', async () => {
    const client = makeClient();
    const resolvePokemon = client.fixtures.pokemon!;
    client.fixtures.pokemon = async (resources) =>
      (await resolvePokemon(resources)).map((pokemon) => ({
        ...pokemon,
        species: { name: 'missing-species' },
      }));

    await expect(buildPokemonCatalog(client)).rejects.toThrow(
      'species-1 is missing species metadata',
    );
  });
});
