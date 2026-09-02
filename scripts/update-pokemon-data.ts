import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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
  statNames,
  type Generation,
  type PokemonCatalog,
  type PokemonKnowledge,
  type StatName,
} from '../src/game/types.ts';

const DATA_PATH = new URL('../src/game/data/pokemon.json', import.meta.url);
const GENERATIONS: readonly Generation[] = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
];
const CONCURRENCY = 4;

export interface CatalogClient {
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
    .replace(/[\n\f]/g, ' ')
    .replace(/pokémon/giu, 'Pokémon')
    .replace(/\s+/g, ' ')
    .trim();

const localized = <T extends { language: { name: string } }>(
  values: readonly T[],
): T | undefined => values.find(({ language }) => language.name === 'en');

const getStats = (pokemon: Pokemon): Record<StatName, number> => {
  const values = Object.fromEntries(
    pokemon.stats.map(({ base_stat, stat }) => [stat.name, base_stat]),
  ) as Partial<Record<StatName, number>>;
  return Object.fromEntries(
    statNames.map((name) => [name, values[name] ?? 0]),
  ) as Record<StatName, number>;
};

const getSprite = (pokemon: Pokemon): string | null =>
  pokemon.sprites.front_default ? `/sprites/pokemon/${pokemon.id}.png` : null;

const getBackSprite = (pokemon: Pokemon): string | null =>
  pokemon.sprites.back_default
    ? `/sprites/pokemon/back/${pokemon.id}.png`
    : null;

const getShinySprite = (pokemon: Pokemon): string | null =>
  pokemon.sprites.front_shiny
    ? `/sprites/pokemon/shiny/${pokemon.id}.png`
    : null;

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
  const speciesByName = new Map<string, PokemonSpecies>();
  const generationBySpecies = new Map<string, Generation>();

  for (const [index, generationName] of GENERATIONS.entries()) {
    const generation = await client.getGenerationById(index + 1);
    const species = await client.resolveSpecies(generation.pokemon_species);
    for (const entry of species) {
      speciesByName.set(entry.name, entry);
      generationBySpecies.set(entry.name, generationName);
    }
  }

  const defaultLinks = [...speciesByName.values()].map((species) => {
    const variety = species.varieties.find(({ is_default }) => is_default);
    if (!variety) {
      throw new Error(`${species.name} has no default Pokémon variety`);
    }
    return variety.pokemon;
  });
  const pokemon = await client.resolvePokemon(defaultLinks);

  const chainLinks = [
    ...new Map(
      [...speciesByName.values()].map((species) => [
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
    const species = speciesByName.get(entry.species.name);
    const generation = generationBySpecies.get(entry.species.name);
    if (!species || !generation) {
      throw new Error(`${entry.name} is missing species metadata`);
    }
    const description = localized(species.flavor_text_entries)?.flavor_text;
    const genus = localized(species.genera)?.genus;
    entries[entry.name] = {
      abilities: entry.abilities
        .sort((left, right) => left.slot - right.slot)
        .map(({ ability }) => ability.name),
      backSprite: getBackSprite(entry),
      description: description ? cleanText(description) : '',
      evolvesFrom: species.evolves_from_species?.name ?? null,
      evolvesTo: [...(evolvesTo.get(species.name) ?? [])].sort(),
      generation,
      genus: genus ? cleanText(genus).replace(/ Pokémon$/i, '') : '',
      id: entry.id,
      levelMoves: getLevelMoves(entry),
      shinySprite: getShinySprite(entry),
      sprite: getSprite(entry),
      stats: getStats(entry),
      types: entry.types
        .sort((left, right) => left.slot - right.slot)
        .map(({ type }) => type.name),
    };
  }

  return {
    contentVersion: 8,
    pokemon: sortRecord(entries),
    typeRelations: sortRecord(typeRelations),
  };
};

export const updatePokemonData = async (
  client: CatalogClient = createCatalogClient(),
) => {
  const catalog = await buildPokemonCatalog(client);
  const output = await format(JSON.stringify(catalog), { parser: 'json' });
  await writeFile(DATA_PATH, output);
  return {
    pokemonCount: Object.keys(catalog.pokemon).length,
    typeCount: Object.keys(catalog.typeRelations).length,
  };
};

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntrypoint) {
  const { pokemonCount, typeCount } = await updatePokemonData();
  console.log(
    `Updated ${pokemonCount} Pokémon and ${typeCount} type matchups from PokéAPI.`,
  );
}
