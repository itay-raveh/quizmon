import { addPkmnDescriptions } from './pkmn-descriptions.ts';
import { clean, english, titleCase } from './catalog-text.ts';
import { formatLocationLabel } from '../src/domain/pokemon/location-label.ts';
import { buildMedicineChoices } from './medicine-choices.ts';
import {
  flattenChain,
  formatRequirements,
  requirementsOf,
  type Ability,
  type Berry,
  type EvolutionChain,
  type Item,
  type ItemCategory,
  type Location,
  type LocationArea,
  type NamedAPIResourceList,
  type Nature,
  type Move,
  type MainClient,
  type Region,
  type Version,
  type VersionGroup,
} from 'pokenode-ts';
import {
  generations,
  type Generation,
  type PokemonCatalog,
  type StatName,
} from '../src/domain/pokemon/types.ts';
import type {
  TopicCatalog,
  TopicEntity,
} from '../src/domain/quiz/topic-catalog.ts';
import {
  isItemSpritePath,
  normalizeSpriteUrl,
} from '../src/domain/pokemon/sprite-source.ts';

const generation = (name: string): Generation | undefined =>
  generations.find((value) => `generation-${value.toLowerCase()}` === name);
const label = (entity: {
  name: string;
  names?: { name: string; language: { name: string } }[];
}) => entity.names?.find(english)?.name ?? titleCase(entity.name);

export const buildTopicCatalog = async (
  client: MainClient,
  catalog: PokemonCatalog,
): Promise<TopicCatalog> => {
  const all = async <T>(endpoint: string): Promise<T[]> => {
    const [list] = await client.resolveAll<NamedAPIResourceList<T>>(
      [`https://pokeapi.co/api/v2/${endpoint}/?limit=10000`],
      { concurrency: 4 },
    );
    if (!list || list.next) throw new Error(`Incomplete ${endpoint} listing`);
    return client.resolveAll(list.results, { concurrency: 4 });
  };
  const groups = await all<VersionGroup>('version-group');
  const versions = await all<Version>('version');
  const groupsByName = new Map(groups.map((group) => [group.name, group]));
  const versionGeneration = new Map(
    versions.map((version) => [
      version.name,
      generation(groupsByName.get(version.version_group.name)!.generation.name),
    ]),
  );
  const games = Object.fromEntries(
    versions.flatMap((version) => {
      const gen = versionGeneration.get(version.name);
      return gen
        ? [[version.name, { label: label(version), generation: gen }]]
        : [];
    }),
  );
  const entity = (
    value: {
      name: string;
      names?: { name: string; language: { name: string } }[];
    },
    gens: (Generation | undefined)[],
  ): TopicEntity => ({
    name: value.name,
    label: label(value),
    generations: [...new Set(gens.filter((gen): gen is Generation => !!gen))],
  });
  const items = await all<Item>('item');
  const categories = new Map(
    (await all<ItemCategory>('item-category')).map((value) => [
      value.name,
      value,
    ]),
  );
  const moves = await all<Move>('move');
  const abilities = await all<Ability>('ability');
  const natures = await all<Nature>('nature');
  const berries = await all<Berry>('berry');
  const regions = await all<Region>('region');
  const locations = await all<Location>('location');
  const areas = await all<LocationArea>('location-area');
  const chains = await all<EvolutionChain>('evolution-chain');
  const regionGeneration = (region: Region) =>
    region.main_generation
      ? generation(region.main_generation.name)
      : undefined;
  const regionsByName = new Map(regions.map((region) => [region.name, region]));
  const locationsByName = new Map(
    locations.map((location) => [location.name, location]),
  );
  const pokemonByApiId = new Map(
    Object.entries(catalog.pokemon).map(([name, pokemon]) => [
      pokemon.pokemonId,
      name,
    ]),
  );
  const pokemonBySpecies = new Map(
    Object.entries(catalog.pokemon)
      .filter(([, pokemon]) => pokemon.pokemonId === pokemon.speciesId)
      .map(([name, pokemon]) => [pokemon.speciesName, name]),
  );
  const encounters: TopicCatalog['encounters'] = [];
  const gaps: TopicCatalog['gaps'] = {
    itemGeneration: [],
    itemSprite: [],
    encounterGames: [],
    evolutionMethods: [],
    dynamicMoveClass: [
      'photon-geyser',
      'light-that-burns-the-sky',
      'shell-side-arm',
      'tera-blast',
      'tera-starstorm',
    ],
    encounterCoverage: [
      'Only ordinary encounter contexts whose recorded slot chances total 100 percent are used. Special-event and Generation III record-mixing swarm coverage remains unverified.',
    ],
  };
  for (const area of areas) {
    const location = locationsByName.get(area.location.name);
    if (!location?.region) continue;
    const areaName = area.names.find(english)?.name;
    const byContext = new Map<
      string,
      {
        game: string;
        method: string;
        conditions: string[];
        pokemon: string[];
        chance: number;
      }
    >();
    for (const entry of area.pokemon_encounters) {
      const id = Number(entry.pokemon.url.split('/').filter(Boolean).at(-1));
      const name = pokemonByApiId.get(id);
      if (!name) continue;
      for (const version of entry.version_details)
        for (const encounter of version.encounter_details) {
          const conditions = encounter.condition_values
            .map((value) => value.name)
            .sort();
          const key = JSON.stringify([
            version.version.name,
            encounter.method.name,
            conditions,
          ]);
          const group = byContext.get(key) ?? {
            game: version.version.name,
            method: encounter.method.name,
            conditions,
            pokemon: [],
            chance: 0,
          };
          group.pokemon.push(name);
          group.chance += encounter.chance;
          byContext.set(key, group);
        }
    }
    for (const context of byContext.values()) {
      const gen = versionGeneration.get(context.game);
      if (gen)
        encounters.push({
          game: context.game,
          method: context.method,
          conditions: context.conditions,
          complete: context.chance === 100,
          generation: gen,
          region: location.region.name,
          area: area.name,
          label: formatLocationLabel(
            label(location) + (areaName ? ` (${areaName})` : ''),
          ),
          pokemon: [...new Set(context.pokemon)].sort(),
        });
    }
  }
  for (const version of versions)
    if (!encounters.some((entry) => entry.game === version.name))
      gaps.encounterGames!.push(version.name);
  const evolutions: TopicCatalog['evolutions'] = [];
  for (const chain of chains) {
    for (const step of flattenChain(chain)) {
      const defaultBefore = pokemonBySpecies.get(step.from.name),
        defaultAfter = pokemonBySpecies.get(step.to.name);
      if (!defaultBefore || !defaultAfter) continue;
      for (const detail of step.details) {
        const resolveForm = (
          reference: { name: string; url: string } | null,
        ) =>
          reference
            ? pokemonByApiId.get(
                Number(reference.url.split('/').filter(Boolean).at(-1)),
              )
            : undefined;
        const before = detail.base_form
          ? resolveForm(detail.base_form)
          : defaultBefore;
        const after = detail.evolved_form
          ? resolveForm(detail.evolved_form)
          : defaultAfter;
        if (!before || !after) {
          gaps.evolutionMethods!.push(`${step.from.name}:${step.to.name}`);
          continue;
        }
        const group = groupsByName.get(detail.version_group?.name);
        const gen = group && generation(group.generation.name);
        if (!group || !gen) {
          gaps.evolutionMethods!.push(`${before}:${after}`);
          continue;
        }
        const requirements = requirementsOf(detail).filter(
          (requirement) =>
            !['base-form', 'evolved-form', 'trigger'].includes(
              requirement.kind,
            ),
        );
        const conditions = requirements.map((requirement) =>
          clean(formatRequirements([requirement])),
        );
        if (!conditions.length) continue;
        for (const version of group.versions)
          evolutions.push({
            before,
            after,
            game: version.name,
            generation: gen,
            trigger: detail.trigger.name,
            ...(detail.item ? { item: detail.item.name } : {}),
            conditions,
          });
      }
    }
  }
  const topics: TopicCatalog = {
    games,
    encounters,
    evolutions,
    gaps,
    medicineChoices: buildMedicineChoices(items),
    items: items.map((item) => {
      const gens = item.game_indices.map((index) =>
        generation(index.generation.name),
      );
      const sprite = normalizeSpriteUrl(item.sprites.default);
      if (!gens.some(Boolean)) gaps.itemGeneration!.push(item.name);
      if (!sprite || !isItemSpritePath(sprite))
        gaps.itemSprite!.push(item.name);
      return {
        ...entity(item, gens),
        sprite: sprite && isItemSpritePath(sprite) ? sprite : null,
        category: item.category.name,
        pocket: categories.get(item.category.name)?.pocket.name ?? '',
      };
    }),
    moves: moves.map((move) => {
      const contexts = move.flavor_text_entries
        .filter(english)
        .flatMap((entry) => {
          const group = groupsByName.get(entry.version_group.name);
          const gen = group && generation(group.generation.name);
          if (!group || !gen) return [];
          const historical = move.past_values
            .filter(
              (value) =>
                value.type &&
                (groupsByName.get(value.version_group.name)?.order ?? -1) >=
                  group.order,
            )
            .sort(
              (a, b) =>
                groupsByName.get(a.version_group.name)!.order -
                groupsByName.get(b.version_group.name)!.order,
            )[0];
          const type = historical?.type?.name ?? move.type.name;
          const damageClass =
            move.name === 'water-shuriken' && gen === 'VI'
              ? 'physical'
              : (move.damage_class?.name ?? '');
          return group.versions.map((version) => ({
            game: version.name,
            generation: gen,
            type,
            damageClass,
          }));
        });
      return {
        ...entity(move, [generation(move.generation.name)]),
        contexts,
        type: move.type.name,
        damageClass: move.damage_class?.name ?? '',
      };
    }),
    abilities: abilities.map((ability) =>
      entity(ability, [generation(ability.generation.name)]),
    ),
    natures: natures.flatMap((nature) =>
      nature.increased_stat && nature.decreased_stat
        ? [
            {
              ...entity(nature, ['III']),
              raised: nature.increased_stat.name as StatName,
              lowered: nature.decreased_stat.name as StatName,
            },
          ]
        : [],
    ),
    berries: berries.map((berry) => ({
      ...entity(
        berry,
        items
          .find((item) => item.name === berry.item.name)
          ?.game_indices.map((index) => generation(index.generation.name)) ??
          [],
      ),
      item: berry.item.name,
      flavors: Object.fromEntries(
        berry.flavors.map((entry) => [entry.flavor.name, entry.potency]),
      ),
      giftType: berry.natural_gift_type?.name ?? '',
    })),
    regions: regions.flatMap((region) => {
      const gen = regionGeneration(region);
      return gen ? [entity(region, [gen])] : [];
    }),
    locations: locations.flatMap((location) => {
      const region = location.region && regionsByName.get(location.region.name);
      const gen = region && regionGeneration(region);
      return region && gen && location.names.some(english)
        ? [{ ...entity(location, [gen]), region: region.name }]
        : [];
    }),
  };
  addPkmnDescriptions(topics);
  return topics;
};
