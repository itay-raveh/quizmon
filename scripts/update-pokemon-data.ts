import { readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import {
  flattenChain,
  MainClient,
  type EvolutionChain,
  type Generation as ApiGeneration,
  type Pokemon,
  type PokemonSpecies,
  type ResourceLink,
  type Type,
} from 'pokenode-ts';
import {
  generations,
  statNames,
  type Generation,
  type PokemonCatalog,
  type PokemonIdentitySprites,
  type PokemonKnowledge,
  type StatName,
  type SpriteMeasurements,
} from '../src/game/types.ts';

import {
  fetchSpriteSource,
  getVersionSpritePath,
  normalizeSpriteUrl,
} from '../src/game/sprite-source.ts';
import { measureCatalogSprites } from './sprite-measurements.ts';

const DATA_PATH = new URL('../src/game/data/pokemon.json', import.meta.url);
const CONCURRENCY = 4;

export interface CatalogClient {
  measureSprites(
    paths: readonly string[],
  ): Promise<Map<string, SpriteMeasurements>>;
  getGenerationById(id: number): Promise<ApiGeneration>;
  resolveEvolutionChains(
    resources: readonly ResourceLink<EvolutionChain>[],
  ): Promise<EvolutionChain[]>;
  resolvePokemon(
    resources: readonly ResourceLink<Pokemon>[],
  ): Promise<Pokemon[]>;
  resolveSpecies(
    resources: readonly ResourceLink<PokemonSpecies>[],
  ): Promise<PokemonSpecies[]>;
  resolveTypes(resources: readonly ResourceLink<Type>[]): Promise<Type[]>;
}

export const createCatalogClient = (
  api: MainClient = new MainClient({
    retry: { attempts: 3 },
    revalidate: true,
  }),
): CatalogClient => ({
  measureSprites: (paths) =>
    measureCatalogSprites(paths, async (path) => {
      const response = await fetchSpriteSource(path, {
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok)
        throw new Error(`Sprite ${path}: HTTP ${response.status}`);
      return Buffer.from(await response.arrayBuffer()).toString('base64');
    }),
  getGenerationById: (id) => api.game.getGenerationById(id),
  resolveEvolutionChains: (resources) =>
    api.resolveAll(resources, { concurrency: CONCURRENCY }),
  resolvePokemon: (resources) =>
    api.resolveAll(resources, { concurrency: CONCURRENCY }),
  resolveSpecies: (resources) =>
    api.resolveAll(resources, { concurrency: CONCURRENCY }),
  resolveTypes: (resources) =>
    api.resolveAll(resources, { concurrency: CONCURRENCY }),
});

const cleanText = (value: string): string =>
  value
    .replaceAll('\u00ad', '')
    .replace(/pokémon/giu, 'Pokémon')
    .replace(/\s+/g, ' ')
    .trim();

const isEnglish = ({ language }: { language: { name: string } }): boolean =>
  language.name === 'en';

const getStats = (pokemon: Pokemon): Record<StatName, number> => {
  const values = new Map(
    pokemon.stats.map(({ base_stat, stat }) => [stat.name, base_stat]),
  );
  return Object.fromEntries(
    statNames.map((name) => [name, values.get(name) ?? 0]),
  ) as Record<StatName, number>;
};

interface VersionSpriteSet {
  back_default?: unknown;
  front_default?: unknown;
}

const getSpriteVersion = (
  value: unknown,
  generation: Generation,
  version: string,
  orientation: 'back' | 'front',
  pokemonId: number,
): string | null => {
  if (typeof value !== 'string') return null;
  const path = normalizeSpriteUrl(value);
  const expectedPath = getVersionSpritePath(
    generation,
    version,
    orientation,
    pokemonId,
  );
  if (path !== expectedPath) {
    throw new Error(`Unexpected version sprite path: ${path}`);
  }
  return version;
};

const getIdentitySprites = (pokemon: Pokemon): PokemonIdentitySprites => {
  const versions = pokemon.sprites.versions as unknown as Record<
    string,
    Record<string, VersionSpriteSet>
  >;
  return {
    generations: generations.flatMap((generation) => {
      const generationSprites =
        versions[`generation-${generation.toLowerCase()}`];
      const front: string[] = [];
      const back: string[] = [];

      for (const [version, sprites] of Object.entries(
        generationSprites ?? {},
      )) {
        if (version === 'icons') continue;
        const frontVersion = getSpriteVersion(
          sprites.front_default,
          generation,
          version,
          'front',
          pokemon.id,
        );
        const backVersion = getSpriteVersion(
          sprites.back_default,
          generation,
          version,
          'back',
          pokemon.id,
        );
        if (frontVersion) front.push(frontVersion);
        if (backVersion) back.push(backVersion);
      }

      return front.length > 0 || back.length > 0
        ? [
            {
              back: back.sort(),
              front: front.sort(),
              generation,
            },
          ]
        : [];
    }),
  };
};

const getLevelMoves = (pokemon: Pokemon): string[] =>
  [
    ...new Set(
      pokemon.moves
        .filter(({ version_group_details }) =>
          version_group_details.some(
            ({ move_learn_method }) => move_learn_method.name === 'level-up',
          ),
        )
        .map(({ move }) => move.name),
    ),
  ].sort();

const sortRecord = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );

export const buildPokemonCatalog = async (
  client: CatalogClient,
): Promise<PokemonCatalog> => {
  const speciesByName = new Map<
    string,
    { species: PokemonSpecies; generation: Generation }
  >();

  for (const [index, generationName] of generations.entries()) {
    const generation = await client.getGenerationById(index + 1);
    const species = await client.resolveSpecies(generation.pokemon_species);
    for (const entry of species) {
      speciesByName.set(entry.name, {
        species: entry,
        generation: generationName,
      });
    }
  }

  const defaultLinks = [...speciesByName.values()].map(({ species }) => {
    const variety = species.varieties.find(({ is_default }) => is_default);
    if (!variety) {
      throw new Error(`${species.name} has no default Pokémon variety`);
    }
    return variety.pokemon;
  });
  const pokemon = await client.resolvePokemon(defaultLinks);

  const chainLinks = [
    ...new Map(
      [...speciesByName.values()].map(({ species }) => [
        species.evolution_chain.url,
        species.evolution_chain,
      ]),
    ).values(),
  ];
  const chains = await client.resolveEvolutionChains(chainLinks);
  const evolvesTo = new Map<string, Set<string>>();
  for (const chain of chains) {
    for (const step of flattenChain(chain)) {
      const destinations = evolvesTo.get(step.from.name) ?? new Set<string>();
      destinations.add(step.to.name);
      evolvesTo.set(step.from.name, destinations);
    }
  }

  const typeLinks = [
    ...new Map(
      pokemon.flatMap(({ types }) =>
        types.map(({ type }) => [type.name, type] as const),
      ),
    ).values(),
  ];
  const types = await client.resolveTypes(typeLinks);
  const typeRelations = Object.fromEntries(
    types
      .filter(({ name }) => name !== 'unknown' && name !== 'shadow')
      .map(({ damage_relations, name }) => [
        name,
        {
          doubleTo: damage_relations.double_damage_to.map(({ name }) => name),
          halfTo: damage_relations.half_damage_to.map(({ name }) => name),
          noneTo: damage_relations.no_damage_to.map(({ name }) => name),
        },
      ]),
  );

  const entries: Record<string, PokemonKnowledge> = {};
  for (const entry of pokemon) {
    const metadata = speciesByName.get(entry.species.name);
    if (!metadata) {
      throw new Error(`${entry.name} is missing species metadata`);
    }
    const { species, generation } = metadata;
    const description =
      species.flavor_text_entries.findLast(isEnglish)?.flavor_text;
    const genus = species.genera.find(isEnglish)?.genus;
    entries[entry.name] = {
      abilities: entry.abilities
        .sort((left, right) => left.slot - right.slot)
        .map(({ ability }) => ability.name),
      color: species.color.name,
      description: description ? cleanText(description) : '',
      evolvesFrom: species.evolves_from_species?.name ?? null,
      evolvesTo: [...(evolvesTo.get(species.name) ?? [])].sort(),
      generation,
      genus: genus ? cleanText(genus).replace(/ Pokémon$/i, '') : '',
      id: entry.id,
      identitySprites: getIdentitySprites(entry),
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      levelMoves: getLevelMoves(entry),
      shape: species.shape.name,
      shinySprite: normalizeSpriteUrl(entry.sprites.front_shiny),
      sprite: normalizeSpriteUrl(entry.sprites.front_default),
      stats: getStats(entry),
      types: entry.types
        .sort((left, right) => left.slot - right.slot)
        .map(({ type }) => type.name),
      spriteMeasurements: null,
    };
  }

  return addSpriteMeasurements(
    {
      contentVersion: 13,
      pokemon: sortRecord(entries),
      typeRelations: sortRecord(typeRelations),
    },
    (paths) => client.measureSprites(paths),
  );
};

const addSpriteMeasurements = async (
  catalog: PokemonCatalog,
  measure: CatalogClient['measureSprites'],
): Promise<PokemonCatalog> => {
  const measurements = await measure(
    Object.values(catalog.pokemon).flatMap(({ sprite }) =>
      sprite ? [sprite] : [],
    ),
  );
  for (const pokemon of Object.values(catalog.pokemon)) {
    if (pokemon.sprite && !measurements.has(pokemon.sprite)) {
      throw new Error(`Missing sprite measurements for ${pokemon.id}`);
    }
    const size = pokemon.sprite ? measurements.get(pokemon.sprite) : undefined;
    pokemon.spriteMeasurements = size
      ? [size.area, size.width, size.height, size.centerX, size.bottom]
      : null;
  }
  return catalog;
};

if (import.meta.main) {
  const client = createCatalogClient();
  const catalog = process.argv.includes('--sprites-only')
    ? await addSpriteMeasurements(
        JSON.parse(await readFile(DATA_PATH, 'utf8')) as PokemonCatalog,
        (paths) => client.measureSprites(paths),
      )
    : await buildPokemonCatalog(client);
  const output = await format(JSON.stringify(catalog), { parser: 'json' });
  await writeFile(DATA_PATH, output);
  const pokemonCount = Object.keys(catalog.pokemon).length;
  const typeCount = Object.keys(catalog.typeRelations).length;
  console.log(
    `Updated ${pokemonCount} Pokémon and ${typeCount} type matchups from PokéAPI.`,
  );
}
