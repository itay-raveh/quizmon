import { readCatalogFiles, writeCatalogFiles } from './catalog-output.ts';
import { addItemSpriteIdentities } from './item-sprite-identities.ts';
import { writeFile } from 'node:fs/promises';
import {
  MainClient,
  type Generation as ApiGeneration,
  type Pokemon,
  type PokemonForm,
  type PokemonSpecies,
  type ResourceLink,
} from 'pokenode-ts';
import { format } from 'prettier';
import {
  generations,
  statNames,
  type Generation,
  type PokemonCatalog,
  type PokemonIdentitySprites,
  type PokemonKnowledge,
  type SpriteMeasurements,
  type StatName,
} from '../src/domain/pokemon/types.ts';
import {
  catalogFormKey,
  groupedFormLabels,
  selectCatalogForms,
} from './catalog-forms.ts';
import {
  formEvolutionLinks,
  mainSeriesDescription,
} from './catalog-selection.ts';

import {
  fetchSpriteSource,
  isSpritePath,
  normalizeSpriteUrl,
} from '../src/domain/pokemon/sprite-source.ts';
import { measureCatalogSprites } from './sprite-measurements.ts';
import { buildTopicCatalog } from './catalog-topics.ts';
import { extractPokemonKnowledge } from './catalog-knowledge.ts';

const DATA_DIRECTORY = new URL('../src/domain/pokemon/data/', import.meta.url);
const CONCURRENCY = 4;

export type CatalogForm = PokemonForm & {
  flavor_text_entries?: PokemonSpecies['flavor_text_entries'];
};

export interface CatalogClient {
  measureSprites(
    paths: readonly string[],
  ): Promise<Map<string, SpriteMeasurements>>;
  getGenerationById(id: number): Promise<ApiGeneration>;
  resolveAll<T>(resources: readonly ResourceLink<T>[]): Promise<T[]>;
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
  resolveAll: (resources) =>
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

const getIdentitySprites = (
  pokemon: Pokemon,
  form: CatalogForm,
  introduced: Generation,
): PokemonIdentitySprites => {
  const source = form.is_default ? pokemon.sprites.versions : {};
  const formVersions = form.sprites.versions as unknown as Record<
    string,
    Record<string, VersionSpriteSet>
  >;
  const versions = source as unknown as Record<
    string,
    Record<string, VersionSpriteSet>
  >;
  return {
    generations: generations.flatMap((generation) => {
      if (generations.indexOf(generation) < generations.indexOf(introduced))
        return [];
      const key = `generation-${generation.toLowerCase()}`;
      const front: string[] = [];
      const back: string[] = [];
      for (const [version, sprites] of Object.entries({
        ...versions[key],
        ...formVersions[key],
      })) {
        if (version === 'icons') continue;
        for (const [orientation, paths] of [
          ['front', front],
          ['back', back],
        ] as const) {
          const value = sprites[`${orientation}_default`];
          if (typeof value !== 'string') continue;
          const path = normalizeSpriteUrl(value)!;
          if (!isSpritePath(path))
            throw new Error(`Unexpected version sprite path: ${path}`);
          paths.push(path);
        }
      }
      return front.length || back.length
        ? [{ generation, front: front.sort(), back: back.sort() }]
        : [];
    }),
  };
};

const titleCase = (value: string) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formLabel = (form: CatalogForm, species: PokemonSpecies) => {
  const label = form.names.find(isEnglish)?.name;
  if (label) return label;
  const speciesLabel =
    species.names.find(isEnglish)?.name ?? titleCase(species.name);
  const formName =
    form.form_names.find(isEnglish)?.name ?? titleCase(form.form_name);
  return formName ? `${speciesLabel} (${formName})` : speciesLabel;
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
    const species = await client.resolveAll(generation.pokemon_species);
    for (const entry of species) {
      speciesByName.set(entry.name, {
        species: entry,
        generation: generationName,
      });
    }
  }

  const varietyLinks = Array.from(speciesByName.values()).flatMap(
    ({ species }) => {
      if (!species.varieties.some(({ is_default }) => is_default))
        throw new Error(`${species.name} has no default Pokémon variety`);
      return species.varieties.map(({ pokemon }) => pokemon);
    },
  );
  const pokemon = await client.resolveAll(varietyLinks);
  const pokemonByName = new Map(pokemon.map((entry) => [entry.name, entry]));
  const allForms = await client.resolveAll<CatalogForm>(
    pokemon.flatMap((entry) => entry.forms),
  );
  for (const form of allForms) {
    const entry = pokemonByName.get(form.pokemon.name);
    if (!entry || !speciesByName.has(entry.species.name))
      throw new Error(`${form.pokemon.name} is missing species metadata`);
  }
  const selection = selectCatalogForms(pokemon, allForms);
  const { forms, genericNames } = selection;
  const versionGroups = await client.resolveAll([
    ...new Map(
      forms.map((form) => [form.version_group.name, form.version_group]),
    ).values(),
  ]);
  const versionsByName = new Map(
    versionGroups.map((group) => [group.name, group]),
  );
  const formsBySpecies = new Map<string, CatalogForm[]>();
  for (const form of forms) {
    const entry = pokemonByName.get(form.pokemon.name)!;
    const siblings = formsBySpecies.get(entry.species.name) ?? [];
    siblings.push(form);
    formsBySpecies.set(entry.species.name, siblings);
  }

  const chainLinks = [
    ...new Map(
      Array.from(speciesByName.values(), ({ species }) => [
        species.evolution_chain.url,
        species.evolution_chain,
      ]),
    ).values(),
  ];
  const chains = await client.resolveAll(chainLinks);
  const { evolvesTo, evolvesFrom } = formEvolutionLinks(
    chains,
    pokemon,
    allForms,
    selection,
  );

  const typeLinks = [
    ...new Map(
      forms.flatMap(({ types }) =>
        types.map(({ type }) => [type.name, type] as const),
      ),
    ).values(),
  ];
  const types = await client.resolveAll(typeLinks);
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
  for (const form of forms) {
    const entry = pokemonByName.get(form.pokemon.name)!;
    const { species, generation: speciesGeneration } = speciesByName.get(
      entry.species.name,
    )!;
    const versionGroup = versionsByName.get(form.version_group.name);
    const generation = generations.find(
      (value) =>
        `generation-${value.toLowerCase()}` === versionGroup?.generation.name,
    );
    if (!generation)
      throw new Error(`Missing introduction generation for ${form.name}`);
    const siblings = formsBySpecies.get(species.name)!;
    const key = catalogFormKey(form);
    if (entries[key]) throw new Error(`Duplicate form key: ${key}`);
    const ownDescription = mainSeriesDescription(
      form.flavor_text_entries ?? [],
    );
    const isSpeciesDefault =
      form.is_default &&
      species.varieties.some(
        (variety) => variety.is_default && variety.pokemon.name === entry.name,
      );
    const alternateVersions = siblings
      .filter((sibling) => sibling !== form)
      .flatMap((sibling) =>
        versionsByName
          .get(sibling.version_group.name)!
          .versions.map(({ name }) => name),
      );
    const description =
      ownDescription ||
      (isSpeciesDefault
        ? mainSeriesDescription(species.flavor_text_entries, alternateVersions)
        : '');
    const genus = species.genera.find(isEnglish)?.genus;
    const family = chains.find((chain) =>
      species.evolution_chain.url.endsWith(`/evolution-chain/${chain.id}/`),
    )?.id;
    if (family === undefined)
      throw new Error(`Missing evolution family for ${form.name}`);
    entries[key] = {
      ...extractPokemonKnowledge(entry, species),
      abilities: entry.abilities
        .toSorted((left, right) => left.slot - right.slot)
        .map(({ ability }) => ability.name),
      color: species.color.name,
      description: cleanText(description),
      displayName:
        groupedFormLabels[key] ??
        (genericNames.has(key)
          ? (species.names.find(isEnglish)?.name ?? titleCase(species.name))
          : formLabel(form, species)),
      hasDistinctDescription:
        Boolean(description) &&
        (siblings.length === 1 ||
          (Boolean(ownDescription) &&
            !siblings.some(
              (sibling) =>
                sibling !== form &&
                cleanText(
                  mainSeriesDescription(sibling.flavor_text_entries ?? []),
                ) === cleanText(description),
            ))),
      evolutionFamily: family,
      evolvesFrom: evolvesFrom.get(key) ?? null,
      evolvesTo: [...(evolvesTo.get(key) ?? [])].sort(),
      generation,
      speciesGeneration,
      speciesId: species.id,
      speciesName: species.name,
      pokemonId: entry.id,
      genus: genus ? cleanText(genus).replace(/ Pokémon$/i, '') : '',
      formId: form.id,
      identitySprites: getIdentitySprites(entry, form, generation),
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      levelMoves: getLevelMoves(entry),
      shape: species.shape?.name ?? '',
      shinySprite: normalizeSpriteUrl(form.sprites.front_shiny),
      sprite: normalizeSpriteUrl(form.sprites.front_default),
      stats: getStats(entry),
      types: form.types
        .toSorted((left, right) => left.slot - right.slot)
        .map(({ type }) => type.name),
      spriteMeasurements: null,
    };
    if (
      !entries[key].types.length ||
      entries[key].types.some((type) => !Object.hasOwn(typeRelations, type))
    )
      throw new Error(`No question types for ${form.name}`);
  }
  const labelCounts = new Map<string, number>();
  for (const entry of Object.values(entries))
    labelCounts.set(
      entry.displayName,
      (labelCounts.get(entry.displayName) ?? 0) + 1,
    );
  for (const [key, entry] of Object.entries(entries)) {
    if (labelCounts.get(entry.displayName)! > 1)
      entry.displayName += ` (${titleCase(key.slice(entry.speciesName.length + 1))})`;
  }

  return addSpriteMeasurements(
    {
      contentVersion: 1,
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
      throw new Error(`Missing sprite measurements for ${pokemon.formId}`);
    }
    const size = pokemon.sprite ? measurements.get(pokemon.sprite) : undefined;
    pokemon.spriteMeasurements = size
      ? [size.area, size.width, size.height, size.centerX, size.bottom]
      : null;
    pokemon.pixelPeekFocus = size?.pixelPeekFocus ?? '';
  }
  return catalog;
};

const addPokemonKnowledge = async (
  catalog: PokemonCatalog,
  client: CatalogClient,
): Promise<PokemonCatalog> => {
  const retained = Object.values(catalog.pokemon);
  const pokemon = await client.resolveAll<Pokemon>(
    [...new Set(retained.map(({ pokemonId }) => pokemonId))].map(
      (id) => `https://pokeapi.co/api/v2/pokemon/${id}/`,
    ),
  );
  const species = await client.resolveAll<PokemonSpecies>(
    [...new Set(retained.map(({ speciesId }) => speciesId))].map(
      (id) => `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
    ),
  );
  const pokemonById = new Map(pokemon.map((entry) => [entry.id, entry]));
  const speciesById = new Map(species.map((entry) => [entry.id, entry]));
  for (const entry of retained) {
    const variety = pokemonById.get(entry.pokemonId);
    const classification = speciesById.get(entry.speciesId);
    if (
      !variety ||
      !classification ||
      variety.species.name !== entry.speciesName
    )
      throw new Error(
        `Missing or mismatched knowledge for form ${entry.formId}`,
      );
    Object.assign(entry, extractPokemonKnowledge(variety, classification));
  }
  return catalog;
};

if (import.meta.main) {
  const client = createCatalogClient();
  const catalog = process.argv.includes('--topics-only')
    ? await readCatalogFiles(DATA_DIRECTORY)
    : process.argv.includes('--sprites-only')
      ? await addSpriteMeasurements(
          await readCatalogFiles(DATA_DIRECTORY),
          (paths) => client.measureSprites(paths),
        )
      : process.argv.includes('--knowledge-only')
        ? await addPokemonKnowledge(
            await readCatalogFiles(DATA_DIRECTORY),
            client,
          )
        : await buildPokemonCatalog(client);
  if (
    process.argv.includes('--topics-only') ||
    !process.argv.some((argument) => argument.endsWith('-only'))
  ) {
    catalog.topics = await buildTopicCatalog(client, catalog);
    await addItemSpriteIdentities(catalog.topics);
    catalog.contentVersion = 1;
  }
  await writeCatalogFiles(
    catalog,
    new URL('../src/domain/pokemon/data/', import.meta.url),
  );
  for (const [file, field] of [
    ['pokemon-labels.json', 'displayName'],
    ['pokemon-generations.json', 'generation'],
  ] as const)
    await writeFile(
      new URL(file, DATA_DIRECTORY),
      await format(
        JSON.stringify(
          Object.fromEntries(
            Object.entries(catalog.pokemon).map(([name, pokemon]) => [
              name,
              pokemon[field],
            ]),
          ),
        ),
        { parser: 'json' },
      ),
    );
  const pokemonCount = Object.keys(catalog.pokemon).length;
  const typeCount = Object.keys(catalog.typeRelations).length;
  console.log(
    `Updated ${pokemonCount} Pokémon and ${typeCount} type matchups from PokéAPI.`,
  );
}
