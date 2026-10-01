import type { PokemonCatalog } from '../../pokemon/types.ts';
import { buildQuestionType } from './registry.ts';
import { difficultyLevels } from '../difficulty.ts';
import { getQuestionVariant } from '../variants.ts';

it('asks only about distinct named places in Name that region', () => {
  const difficulty = difficultyLevels.find((level) =>
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
    difficulty,
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
});

it('uses the whole location and selects every offered encounter for multi-select', () => {
  const singleLevel = difficultyLevels.find(
    (level) =>
      getQuestionVariant('encounterLocations', level)?.variant.response
        .selection === 'single',
  )!;
  const multiLevel = difficultyLevels.find(
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
  const single = buildQuestionType(
    { ...base, difficulty: singleLevel },
    'encounterLocations',
  );
  const multi = buildQuestionType(
    { ...base, difficulty: multiLevel },
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
  expect(multi?.answer.correctOptions.toSorted()).toEqual(['a', 'b']);
  expect(multi?.options).toEqual(expect.arrayContaining(['a', 'b']));
});
