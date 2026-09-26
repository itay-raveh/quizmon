import type { PokemonCatalog } from '../../pokemon/types.ts';
import { buildQuestionType } from './registry.ts';

it('asks only about distinct named places in Name that region', () => {
  const regions = ['kanto', 'johto', 'sinnoh', 'paldea'].map((name) => ({
    name,
    label: name,
    generations: ['I' as const],
  }));
  const locations = (
    [
      ['inside-of-truck', '???', 'kanto'],
      ['unknown-all-bugs', 'Unknown; all bugs', 'johto'],
      ['sinnoh-cafe', 'Café', 'sinnoh'],
      ['sinnoh-restaurant', 'Restaurant', 'sinnoh'],
      ['unknown-dungeon', 'Unknown Dungeon', 'kanto'],
      ['north-province', 'North Province (Area Three)', 'paldea'],
      ['ecruteak-city', 'Ecruteak City', 'johto'],
    ] as const
  ).map(([name, label, region]) => ({
    name,
    label,
    region,
    generations: ['I' as const],
  }));
  const catalog = {
    contentVersion: 1,
    pokemon: {},
    topics: { regions, locations },
  } as unknown as PokemonCatalog;
  const context = {
    catalog,
    difficulty: 3 as const,
    pool: [],
    random: () => 0,
    used: new Set<string>(),
  };

  expect(buildQuestionType(context, 'name-that-region')?.subject.name).toBe(
    'ecruteak-city',
  );
  expect(
    buildQuestionType(
      {
        ...context,
        catalog: {
          ...catalog,
          topics: { ...catalog.topics!, locations: locations.slice(0, -1) },
        },
      },
      'name-that-region',
    ),
  ).toBeUndefined();
});

it('uses the whole location and selects every offered encounter at level five', () => {
  const names = ['a', 'b', 'c', 'd', 'e'];
  const pokemon = Object.fromEntries(
    names.map((name, index) => [
      name,
      {
        speciesId: index + 1,
        speciesName: name,
        displayName: name,
        sprite: `/${name}.png`,
        generation: 'I',
        types: ['normal'],
        stats: {
          hp: 50,
          attack: 50,
          defense: 50,
          'special-attack': 50,
          'special-defense': 50,
          speed: 50,
        },
        evolvesTo: [],
      },
    ]),
  );
  const encounter = (
    area: string,
    label: string,
    names: string[],
    complete: boolean,
  ) => ({
    area,
    label,
    pokemon: names,
    complete,
    game: 'red',
    generation: 'I' as const,
    region: 'kanto',
    method: 'walk',
    conditions: [],
  });
  const catalog = {
    contentVersion: 1,
    pokemon,
    topics: {
      games: { red: { label: 'Red', generation: 'I' } },
      encounters: [
        encounter('route-4-north', 'Route 4 (North)', ['a'], true),
        encounter('route-4-south', 'Route 4 (South)', ['b'], true),
        encounter('route-5', 'Route 5', ['c', 'd', 'e'], false),
      ],
    },
  } as unknown as PokemonCatalog;
  const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
    name,
    pokemon,
  }));
  const base = {
    catalog,
    pool,
    random: () => 0,
    used: new Set<string>(),
  };
  const level4 = buildQuestionType(
    { ...base, difficulty: 4 },
    'encounter-locations',
  );
  const level5 = buildQuestionType(
    { ...base, difficulty: 5 },
    'encounter-locations',
  );

  expect(level4?.prompt).toMatchObject({
    text: 'Which Pokémon can you find at Route 4?',
  });
  expect(level4?.answer.interaction).toBe('single-choice');
  expect(
    level4?.options.filter((name) => ['a', 'b'].includes(name)),
  ).toHaveLength(1);
  expect(level5?.prompt).toMatchObject({
    text: 'Which Pokémon can you find at Route 4? Select all that apply.',
  });
  expect(level5?.answer.interaction).toBe('multi-select');
  expect(level5?.answer.correctOptions.toSorted()).toEqual(['a', 'b']);
  expect(level5?.options).toHaveLength(4);
});
