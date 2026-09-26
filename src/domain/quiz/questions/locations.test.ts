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
