import berries from '../../pokemon/data/topics-berries-0.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { buildBerry } from './berries.ts';

const question = (
  name: string,
  questionType: 'natural-gift' | 'berry-flavors',
) => {
  const berry = berries.values.find((entry) => entry.name === name)!;
  const catalog = {
    typeRelations: Object.fromEntries(
      [...new Set(berries.values.map((entry) => entry.giftType))]
        .filter(Boolean)
        .map((type) => [type, {}]),
    ),
    topics: {
      berries: [berry],
      items: [{ name: berry.item, label: berry.label, sprite: '/berry.png' }],
    },
  } as unknown as PokemonCatalog;
  return buildBerry({
    catalog,
    generations: ['VI'],
    pool: [],
    questionType,
    random: () => 0.5,
    used: new Set(),
  });
};

it('uses Natural Gift data independently of flavor data', () => {
  expect(question('kee', 'natural-gift')?.answer.correctOptions).toEqual([
    'fairy',
  ]);
  expect(question('maranga', 'natural-gift')?.answer.correctOptions).toEqual([
    'dark',
  ]);
  expect(question('roseli', 'natural-gift')).toBeUndefined();
  expect(question('kee', 'berry-flavors')).toBeUndefined();
  expect(question('cheri', 'berry-flavors')?.answer.correctOptions).toEqual([
    'Spicy',
  ]);
});
