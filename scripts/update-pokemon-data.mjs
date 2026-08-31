import { readFile, writeFile } from 'node:fs/promises';

const DATA_PATH = new URL('../src/game/data/pokemon.json', import.meta.url);
const GENERATION = 9;
const GENERATION_NAME = 'IX';
const CONCURRENCY = 8;

const requestJson = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
};

const mapConcurrent = async (values, mapper) => {
  const results = [];
  let cursor = 0;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(values[index]);
    }
  });

  await Promise.all(workers);
  return results;
};

const catalog = JSON.parse(await readFile(DATA_PATH, 'utf8'));
const generation = await requestJson(
  `https://pokeapi.co/api/v2/generation/${GENERATION}`,
);

const defaultPokemon = await mapConcurrent(
  generation.pokemon_species,
  async (species) => {
    const detail = await requestJson(species.url);
    const defaultVariety = detail.varieties.find(
      (variety) => variety.is_default,
    );
    if (!defaultVariety)
      throw new Error(`${species.name} has no default variety`);
    return defaultVariety.pokemon.name;
  },
);

for (const name of defaultPokemon.sort()) {
  catalog[name] = { formCategory: 'default', generation: GENERATION_NAME };
}

await writeFile(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `Updated ${defaultPokemon.length} Generation ${GENERATION_NAME} Pokémon.`,
);
