import { readCatalogFiles, writeCatalogFiles } from './catalog-output.ts';
import { clean, english, titleCase } from './catalog-text.ts';
import { addItemSpriteIdentities } from './item-sprite-identities.ts';
import { writeFile } from 'node:fs/promises';
import {
  MainClient,
  type Pokemon,
  type PokemonForm,
  type PokemonSpecies,
} from 'pokenode-ts';
import { format } from 'prettier';
import {
  generations,
  statNames,
  type Generation,
  type PokemonCatalog,
  type PokemonIdentitySprites,
  type PokemonKnowledge,
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
import { addPkmnDescriptions } from './pkmn-descriptions.ts';
import { addShowdownBattleData } from './showdown-battle.ts';
import { gameVersions } from '../src/domain/versions.ts';

const DATA_DIRECTORY = new URL('../src/domain/pokemon/data/', import.meta.url);
const CONCURRENCY = 4;

export type CatalogForm = PokemonForm & {
  flavor_text_entries?: PokemonSpecies['flavor_text_entries'];
};

const measureSprites = (paths: readonly string[]) =>
  measureCatalogSprites(paths, async (path) => {
    const response = await fetchSpriteSource(path, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error(`Sprite ${path}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer()).toString('base64');
  });

const cleanText = (value: string): string =>
  clean(value.replaceAll('\u00ad', '').replace(/pokémon/giu, 'Pokémon'));

export const getStats = (pokemon: Pokemon): Record<StatName, number> => {
  return Object.fromEntries(
    statNames.map((name) => {
      const matches = pokemon.stats.filter(({ stat }) => stat.name === name);
      const [entry] = matches;
      if (
        matches.length !== 1 ||
        !entry ||
        !Number.isFinite(entry.base_stat) ||
        entry.base_stat <= 0
      )
        throw new Error(`Invalid ${name} stat for ${pokemon.name}`);
      return [name, entry.base_stat];
    }),
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

const formLabel = (form: CatalogForm, species: PokemonSpecies) => {
  const label = form.names.find(english)?.name;
  if (label) return label;
  const speciesLabel =
    species.names.find(english)?.name ?? titleCase(species.name);
  const formName =
    form.form_names.find(english)?.name ?? titleCase(form.form_name);
  return formName ? `${speciesLabel} (${formName})` : speciesLabel;
};

const sortRecord = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );

export const buildPokemonCatalog = async (
  client: MainClient,
): Promise<PokemonCatalog> => {
  const speciesByName = new Map<string, PokemonSpecies>();

  for (const [index] of generations.entries()) {
    const generation = await client.game.getGenerationById(index + 1);
    const species = await client.resolveAll(generation.pokemon_species, {
      concurrency: CONCURRENCY,
    });
    for (const entry of species) {
      speciesByName.set(entry.name, entry);
    }
  }

  const varietyLinks = Array.from(speciesByName.values()).flatMap((species) => {
    if (!species.varieties.some(({ is_default }) => is_default))
      throw new Error(`${species.name} has no default Pokémon variety`);
    return species.varieties.map(({ pokemon }) => pokemon);
  });
  const pokemon = await client.resolveAll(varietyLinks, {
    concurrency: CONCURRENCY,
  });
  const pokemonByName = new Map(pokemon.map((entry) => [entry.name, entry]));
  const allForms = await client.resolveAll<CatalogForm>(
    pokemon.flatMap((entry) => entry.forms),
    { concurrency: CONCURRENCY },
  );
  for (const form of allForms) {
    const entry = pokemonByName.get(form.pokemon.name);
    if (!entry || !speciesByName.has(entry.species.name))
      throw new Error(`${form.pokemon.name} is missing species metadata`);
  }
  const selection = selectCatalogForms(pokemon, allForms);
  const { forms, genericNames } = selection;
  const versionGroups = await client.resolveAll(
    [
      ...new Map(
        forms.map((form) => [form.version_group.name, form.version_group]),
      ).values(),
    ],
    { concurrency: CONCURRENCY },
  );
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
      Array.from(speciesByName.values(), (species) => [
        species.evolution_chain.url,
        species.evolution_chain,
      ]),
    ).values(),
  ];
  const chains = await client.resolveAll(chainLinks, {
    concurrency: CONCURRENCY,
  });
  const { evolvesTo, evolvesFrom } = formEvolutionLinks(
    chains,
    pokemon,
    allForms,
    selection,
  );

  const entries: Record<string, PokemonKnowledge> = {};
  for (const form of forms) {
    const entry = pokemonByName.get(form.pokemon.name)!;
    const species = speciesByName.get(entry.species.name)!;
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
    const genus = species.genera.find(english)?.genus;
    const family = chains.find((chain) =>
      species.evolution_chain.url.endsWith(`/evolution-chain/${chain.id}/`),
    )?.id;
    if (family === undefined)
      throw new Error(`Missing evolution family for ${form.name}`);
    entries[key] = {
      ...extractPokemonKnowledge(entry),
      abilities: entry.abilities
        .toSorted((left, right) => left.slot - right.slot)
        .map(({ ability }) => ability.name),
      color: species.color.name,
      description: cleanText(description),
      displayName:
        groupedFormLabels[key] ??
        (genericNames.has(key)
          ? (species.names.find(english)?.name ?? titleCase(species.name))
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
      speciesId: species.id,
      speciesName: species.name,
      pokemonId: entry.id,
      genus: genus ? cleanText(genus).replace(/ Pokémon$/i, '') : '',
      formId: form.id,
      identitySprites: getIdentitySprites(entry, form, generation),
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      levelMoves: [],
      shape: species.shape?.name ?? '',
      shinySprite: normalizeSpriteUrl(form.sprites.front_shiny),
      sprite: normalizeSpriteUrl(form.sprites.front_default),
      stats: getStats(entry),
      types: form.types
        .toSorted((left, right) => left.slot - right.slot)
        .map(({ type }) => type.name),
      spriteMeasurements: null,
    };
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
      contentVersion: gameVersions.content,
      pokemon: sortRecord(entries),
      typeRelations: {},
    },
    measureSprites,
  );
};

const addSpriteMeasurements = async (
  catalog: PokemonCatalog,
  measure: typeof measureSprites,
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

if (import.meta.main) {
  const [mode, ...extra] = process.argv.slice(2);
  if (
    extra.length ||
    (mode !== undefined &&
      !['--topics-only', '--sprites-only', '--showdown-only'].includes(mode))
  )
    throw new Error('Use one catalog update mode at a time.');
  const client = new MainClient({
    retry: { attempts: 3 },
    revalidate: true,
  });
  const catalog =
    mode === '--showdown-only'
      ? await readCatalogFiles(DATA_DIRECTORY)
      : mode === '--topics-only'
        ? await readCatalogFiles(DATA_DIRECTORY)
        : mode === '--sprites-only'
          ? await addSpriteMeasurements(
              await readCatalogFiles(DATA_DIRECTORY),
              measureSprites,
            )
          : await buildPokemonCatalog(client);
  if (mode === '--showdown-only') {
    if (!catalog.topics) throw new Error('Missing topic catalog');
    addPkmnDescriptions(catalog.topics);
    catalog.contentVersion = gameVersions.content;
  } else if (mode === '--topics-only' || mode === undefined) {
    const topics = await buildTopicCatalog(client, catalog);
    await addItemSpriteIdentities(topics);
    catalog.topics = topics;
    catalog.contentVersion = gameVersions.content;
  }
  if (mode !== '--sprites-only') {
    await addShowdownBattleData(catalog);
    for (const [name, pokemon] of Object.entries(catalog.pokemon))
      if (
        !pokemon.types.length ||
        pokemon.types.some((type) => !catalog.typeRelations[type])
      )
        throw new Error(`Missing Showdown battle types for ${name}`);
  }
  await writeCatalogFiles(catalog, DATA_DIRECTORY);
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
    mode === '--showdown-only'
      ? 'Updated packaged Pokémon Showdown battle data.'
      : `Updated ${pokemonCount} Pokémon and ${typeCount} Showdown type matchups.`,
  );
}
