import { createPokemonSearchEntry, createSearch } from './search';

const search = createSearch(
  [
    'pikachu',
    'raichu',
    'raichu-alola',
    'mr-mime',
    'nidoran-f',
    'nidoran-m',
    'farfetchd',
    'fire',
    'fighting',
    'water',
    'steel',
  ].map((name) => createPokemonSearchEntry({ name })),
);

it.each([
  ['pikchu', 'pikachu'],
  ['alolan raicu', 'raichu-alola'],
  ['raichu-alola', 'raichu-alola'],
  ['ＭＲ. MÍME', 'mr-mime'],
  ['Nidoran ♀', 'nidoran-f'],
  ['Nidoran ♂', 'nidoran-m'],
  ['Farfetch’d', 'farfetchd'],
  ['fier', 'fire'],
  ['waer', 'water'],
  ['stel', 'steel'],
])('ranks %s as %s', (query, name) => {
  expect(search(query)[0]?.name).toBe(name);
});

it('keeps exact names ahead of forms and rejects empty or unrelated queries', () => {
  expect(search('raichu')[0]?.name).toBe('raichu');
  expect(search('')).toEqual([]);
  expect(search('   ')).toEqual([]);
  expect(search('zzzzzzzzzz')).toEqual([]);
});
