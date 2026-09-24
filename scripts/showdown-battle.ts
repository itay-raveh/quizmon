import { Dex } from '@pkmn/dex';
import {
  generations,
  type Generation,
  type PokemonCatalog,
  type PokemonKnowledge,
  type StatName,
} from '../src/domain/pokemon/types.ts';
import type { EditorialTopicCatalog } from './editorial-topic-catalog.ts';

const statNames = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
} as const;
const normalize = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, '');
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const species = Dex.species.all();

const showdownSpecies = (key: string, pokemon: PokemonKnowledge) => {
  const direct = Dex.species.get(key);
  if (direct.exists && direct.num === pokemon.speciesId) return direct;
  const candidates = species.filter(
    (entry) =>
      entry.num === pokemon.speciesId &&
      entry.types.map((type) => type.toLowerCase()).join(',') ===
        pokemon.types.join(',') &&
      Object.entries(statNames).every(
        ([name, stat]) =>
          entry.baseStats[stat] === pokemon.stats[name as StatName],
      ),
  );
  if (candidates.length === 1) return candidates[0]!;
  const byLabel = candidates.filter(
    (entry) => normalize(entry.name) === normalize(pokemon.displayName),
  );
  if (byLabel.length === 1) return byLabel[0]!;
  const sex = key.includes('-male')
    ? '-M-'
    : key.includes('-female')
      ? '-F-'
      : '';
  const bySex = candidates.filter((entry) => sex && entry.name.includes(sex));
  if (bySex.length === 1) return bySex[0]!;
  throw new Error(`No unambiguous Showdown species for ${key}`);
};

const moveFacts = (name: string, generation: Generation) => {
  const move = Dex.forGen(generations.indexOf(generation) + 1).moves.get(name);
  if (!move.exists || move.isNonstandard === 'Future') return;
  return {
    type: move.type.toLowerCase(),
    damageClass: move.category.toLowerCase(),
  };
};

export const addShowdownBattleData = async (
  catalog: PokemonCatalog,
): Promise<void> => {
  const topics = catalog.topics as EditorialTopicCatalog | undefined;
  if (!topics) throw new Error('Missing topic catalog');
  const previousConflicts = topics.gaps.showdownAbilityConflicts;
  const conflicts: string[] = [];
  const missingLearnsets: string[] = [];
  const abilityTopicNames = new Map(
    topics.abilities.map((ability) => [normalize(ability.name), ability.name]),
  );
  const moveTopicNames = new Map(
    topics.moves.map((move) => [normalize(move.name), move.name]),
  );
  const missingAbilityTopics = new Set<string>();

  for (const [key, pokemon] of Object.entries(catalog.pokemon)) {
    const entry = showdownSpecies(key, pokemon);
    const oldAbilities = pokemon.abilities;
    const slots = (
      [
        ['0', 1],
        ['1', 2],
        ['H', 3],
      ] as const
    ).flatMap(([kind, slot]) => {
      const ability = entry.abilities[kind];
      if (!ability) return [];
      const name = abilityTopicNames.get(normalize(ability)) ?? slug(ability);
      if (!abilityTopicNames.has(normalize(ability)))
        missingAbilityTopics.add(name);
      return [
        {
          name,
          hidden: kind === 'H',
          slot,
        },
      ];
    });
    const abilityNames = slots.map(({ name }) => name);
    const conflict =
      previousConflicts?.includes(key) ||
      (!previousConflicts &&
        oldAbilities.map(normalize).sort().join(',') !==
          abilityNames.map(normalize).sort().join(','));
    if (conflict) conflicts.push(key);
    pokemon.abilities = conflict ? [] : abilityNames;
    pokemon.abilitySlots = conflict ? undefined : slots;
    pokemon.types = entry.types.map((type) => type.toLowerCase());
    pokemon.stats = Object.fromEntries(
      Object.entries(statNames).map(([name, stat]) => [
        name,
        entry.baseStats[stat],
      ]),
    ) as PokemonKnowledge['stats'];
    const learnset = await Dex.learnsets.get(entry.name);
    const inherited = learnset.exists
      ? learnset
      : await Dex.learnsets.get(entry.changesFrom ?? entry.baseSpecies);
    if (!inherited.exists) missingLearnsets.push(key);
    pokemon.levelMoves = Object.entries(inherited.learnset ?? {})
      .filter(([, sources]) =>
        sources.some((source) => /^\d+L\d+/.test(source)),
      )
      .map(([name]) => moveTopicNames.get(normalize(name)))
      .filter((name): name is string => Boolean(name))
      .sort();
  }

  const types = [
    ...new Set(Object.values(catalog.pokemon).flatMap((p) => p.types)),
  ].sort();
  catalog.typeRelations = Object.fromEntries(
    types.map((attack) => {
      const doubleTo: string[] = [];
      const halfTo: string[] = [];
      const noneTo: string[] = [];
      for (const defense of types) {
        const value =
          Dex.types.get(defense).damageTaken[Dex.types.get(attack).name];
        if (value === 1) doubleTo.push(defense);
        if (value === 2) halfTo.push(defense);
        if (value === 3) noneTo.push(defense);
      }
      return [attack, { doubleTo, halfTo, noneTo }];
    }),
  );

  const statFromShowdown = Object.fromEntries(
    Object.entries(statNames).map(([name, id]) => [id, name]),
  ) as Record<string, StatName>;
  const natureLabels = new Map(
    topics.natures.map((nature) => [nature.name, nature.label]),
  );
  topics.natures = Dex.natures.all().flatMap((nature) =>
    nature.plus && nature.minus
      ? [
          {
            name: nature.name.toLowerCase(),
            label: natureLabels.get(nature.name.toLowerCase()) ?? nature.name,
            generations: ['III' as const],
            raised: statFromShowdown[nature.plus]!,
            lowered: statFromShowdown[nature.minus]!,
          },
        ]
      : [],
  );

  const missingMoves: string[] = [];
  for (const move of topics.moves) {
    move.contexts = move.contexts.map((context) => {
      const facts = moveFacts(move.name, context.generation);
      if (!facts || !types.includes(facts.type)) {
        missingMoves.push(`${move.name}:${context.game}`);
        return { ...context, type: '', damageClass: '' };
      }
      return { ...context, ...facts };
    });
    const current = moveFacts(move.name, 'IX');
    move.type = current?.type ?? '';
    move.damageClass = current?.damageClass ?? '';
  }
  topics.gaps.showdownAbilityConflicts = conflicts;
  topics.gaps.showdownAbilityTopics = [...missingAbilityTopics].sort();
  topics.gaps.showdownLearnsets = missingLearnsets;
  topics.gaps.showdownMoveContexts = missingMoves;
};
