import { Dex, toID } from '@pkmn/dex';
import {
  generations,
  type Generation,
  type PokemonCatalog,
  type PokemonKnowledge,
  type StatName,
} from '../src/domain/pokemon/types.ts';

const statNames = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
} as const;
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const species = Dex.species.all();

export const showdownSpecies = (key: string, pokemon: PokemonKnowledge) => {
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
  const byForm = candidates.filter((entry) => {
    const form = slug(entry.forme || entry.baseForme);
    return form && `-${key}-`.includes(`-${form}-`);
  });
  const gender = key.includes('-male')
    ? 'M'
    : key.includes('-female')
      ? 'F'
      : undefined;
  const byGender = candidates.filter(
    (entry) => gender && entry.gender === gender,
  );
  const match = [candidates, byForm, byGender].find(
    (matches) => matches.length === 1,
  )?.[0];
  if (!match) throw new Error(`No unambiguous Showdown species for ${key}`);
  return match;
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
  const topics = catalog.topics;
  if (!topics) throw new Error('Missing topic catalog');
  const abilityTopicNames = new Map(
    topics.abilities.map((ability) => [toID(ability.name), ability.name]),
  );
  const moveTopicNames = new Map(
    topics.moves.map((move) => [toID(move.name), move.name]),
  );

  for (const [key, pokemon] of Object.entries(catalog.pokemon)) {
    const entry = showdownSpecies(key, pokemon);
    const oldAbilities = pokemon.abilities;
    const slots = (['0', '1', 'H'] as const).flatMap((kind) => {
      const ability = entry.abilities[kind];
      if (!ability) return [];
      const name = abilityTopicNames.get(toID(ability)) ?? slug(ability);
      return [
        {
          name,
          hidden: kind === 'H',
          slot: kind === 'H' ? 3 : Number(kind) + 1,
        },
      ];
    });
    const abilityNames = slots.map(({ name }) => name);
    const conflict =
      oldAbilities.map(toID).sort().join(',') !==
      abilityNames.map(toID).sort().join(',');
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
    pokemon.levelMoves = Object.entries(inherited.learnset ?? {})
      .filter(([, sources]) =>
        sources.some((source) => /^\d+L\d+/.test(source)),
      )
      .map(([name]) => moveTopicNames.get(toID(name)))
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

  for (const move of topics.moves) {
    move.contexts = move.contexts.map((context) => {
      const facts = moveFacts(move.name, context.generation);
      if (!facts || !types.includes(facts.type)) {
        return { ...context, type: '', damageClass: '' };
      }
      return { ...context, ...facts };
    });
    const current = moveFacts(move.name, 'IX');
    move.type = current?.type ?? '';
    move.damageClass = current?.damageClass ?? '';
  }
};
