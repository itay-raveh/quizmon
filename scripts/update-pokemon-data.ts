import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { GameClient } from 'pokenode-ts';
import type { PokemonCatalog, PokemonSummary } from '../src/game/types.ts';

const DATA_PATH = new URL('../src/game/data/pokemon.json', import.meta.url);
const GENERATIONS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
] as const;

interface SpeciesLink {
  name: string;
  url: string;
}

interface SpeciesResult {
  varieties: Array<{
    is_default: boolean;
    pokemon: { name: string };
  }>;
}

export interface CatalogClient {
  getGenerationById(id: number): Promise<{
    pokemon_species: SpeciesLink[];
  }>;
  resolveAll(
    resources: readonly SpeciesLink[],
    options: { concurrency: number },
  ): Promise<SpeciesResult[]>;
}

const sortCatalog = (catalog: PokemonCatalog): PokemonCatalog =>
  Object.fromEntries(
    Object.entries(catalog)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([name, pokemon]) => [
        name,
        {
          formCategory: pokemon.formCategory,
          generation: pokemon.generation,
        },
      ]),
  );

export const buildPokemonCatalog = async (
  existing: PokemonCatalog,
  client: CatalogClient,
): Promise<PokemonCatalog> => {
  const defaults: PokemonCatalog = {};

  for (const [index, generationName] of GENERATIONS.entries()) {
    const generation = await client.getGenerationById(index + 1);
    const species = await client.resolveAll(generation.pokemon_species, {
      concurrency: 4,
    });

    for (const entry of species) {
      const defaultVariety = entry.varieties.find(
        (variety) => variety.is_default,
      );
      if (!defaultVariety) {
        throw new Error('Pokémon species has no default variety');
      }
      defaults[defaultVariety.pokemon.name] = {
        formCategory: 'default',
        generation: generationName,
      };
    }
  }

  const curatedForms = Object.fromEntries(
    Object.entries(existing).filter(
      ([, pokemon]) => pokemon.formCategory !== 'default',
    ),
  ) as Record<string, PokemonSummary>;

  return sortCatalog({ ...defaults, ...curatedForms });
};

export const updatePokemonData = async (
  client: CatalogClient = new GameClient(),
) => {
  const existing = JSON.parse(
    await readFile(DATA_PATH, 'utf8'),
  ) as PokemonCatalog;
  const catalog = await buildPokemonCatalog(existing, client);
  await writeFile(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

  const defaultCount = Object.values(catalog).filter(
    ({ formCategory }) => formCategory === 'default',
  ).length;
  return { defaultCount, totalCount: Object.keys(catalog).length };
};

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntrypoint) {
  const { defaultCount, totalCount } = await updatePokemonData();
  console.log(
    `Updated ${defaultCount} default Pokémon across nine generations (${totalCount} total forms).`,
  );
}
