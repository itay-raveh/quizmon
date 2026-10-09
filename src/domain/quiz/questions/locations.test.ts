import type { PokemonCatalog } from '../../pokemon/types.ts';
import { buildQuestionType } from './registry.ts';
import { gameLevels } from '../level.ts';
import { getQuestionVariant } from '../variants.ts';

it('asks only about distinct named places in Name that region', () => {
  const level = gameLevels.find((level) =>
    getQuestionVariant('locationRegion', level),
  )!;
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
      ['route-201', 'Route 201', 'sinnoh'],
      ['sea-route-12', 'Sea Route 12', 'kanto'],
      ['ecruteak-city', 'Ecruteak City', 'johto'],
    ] as const
  ).map(([name, label, region]) => ({
    name,
    label,
    region,
    generations: ['I' as const],
  }));
  const catalog = {
    pokemon: {},
    topics: { regions, locations },
  } as unknown as PokemonCatalog;
  const context = {
    catalog,
    level,
    pool: [],
    random: () => 0,
    used: new Set<string>(),
  };

  expect(buildQuestionType(context, 'locationRegion')?.subject.name).toBe(
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
      'locationRegion',
    ),
  ).toBeUndefined();
  for (const [level, route] of [
    [4, locations.at(-3)!],
    [5, locations.at(-2)!],
  ] as const) {
    expect(
      buildQuestionType(
        {
          ...context,
          level,
          catalog: {
            ...catalog,
            topics: { ...catalog.topics!, locations: [route] },
          },
        },
        'locationRegion',
      )?.subject.name,
    ).toBe(route.name);
  }
});

it('rejects placeholder locations and aggregates valid encounter subareas', () => {
  const singleLevel = gameLevels.find(
    (level) =>
      getQuestionVariant('encounterLocations', level)?.variant.response
        .selection === 'single',
  )!;
  const multiLevel = gameLevels.find(
    (level) =>
      getQuestionVariant('encounterLocations', level)?.variant.response
        .selection === 'multi',
  )!;
  const names = ['a', 'b', 'c', 'd', 'e'];
  const pokemon = Object.fromEntries(
    names.map((name, index) => [
      name,
      {
        speciesId: index + 1,
        speciesName: name,
        displayName: name,
        sprite: `/${name}.png`,
        identitySprites: { generations: [] },
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
  for (const label of [
    'Unknown; all bugs (Unknown Area; all bugs)',
    'Unknown: all bugs',
    'Unknown Dungeon',
    '??? (North)',
    ' (North)',
  ]) {
    for (const level of [singleLevel, multiLevel]) {
      expect(
        buildQuestionType(
          {
            ...base,
            level,
            catalog: {
              ...catalog,
              topics: {
                ...catalog.topics!,
                encounters: [encounter('placeholder', label, ['a'], true)],
              },
            },
          },
          'encounterLocations',
        ),
        label,
      ).toBeUndefined();
    }
  }
  const single = buildQuestionType(
    { ...base, level: singleLevel },
    'encounterLocations',
  );
  const multi = buildQuestionType(
    { ...base, level: multiLevel },
    'encounterLocations',
  );
  const multiTwo = buildQuestionType(
    { ...base, level: multiLevel, random: () => 0.9 },
    'encounterLocations',
  );
  const fourCatalog = {
    ...catalog,
    topics: {
      ...catalog.topics!,
      encounters: [
        encounter('route-4-north', 'Route 4 (North)', ['a', 'c'], true),
        encounter('route-4-south', 'Route 4 (South)', ['b', 'd'], true),
        encounter('route-5', 'Route 5', ['e'], false),
      ],
    },
  } as PokemonCatalog;
  const multiFour = buildQuestionType(
    { ...base, catalog: fourCatalog, level: multiLevel, random: () => 0.9 },
    'encounterLocations',
  );

  expect(single?.prompt.kind === 'text' && single.prompt.text).toContain(
    'Route 4',
  );
  expect(single?.answer.interaction).toBe('single-choice');
  expect(
    single?.options.filter((name) => ['a', 'b'].includes(name)),
  ).toHaveLength(1);
  expect(multi?.prompt.kind === 'text' && multi.prompt.text).toContain(
    'Route 4',
  );
  expect(multi?.answer.interaction).toBe('multi-select');
  expect(multi?.answer.correctOptions).toEqual(['a']);
  expect(multi?.options).not.toContain('b');
  expect(multiTwo?.answer.correctOptions.toSorted()).toEqual(['a', 'b']);
  expect(multiFour?.answer.correctOptions).toHaveLength(4);
  expect(multiFour?.answer.correctOptions.toSorted()).toEqual(
    multiFour?.options.toSorted(),
  );
});
