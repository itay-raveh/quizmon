import type { Pokemon } from 'pokenode-ts';
import { statNames } from '../src/domain/pokemon/types';
import { getStats } from './update-pokemon-data';

it('rejects incomplete or ambiguous upstream base stats', () => {
  const pokemon = {
    name: 'fixture',
    stats: statNames.map((name, index) => ({
      base_stat: index + 1,
      stat: { name },
    })),
  } as unknown as Pokemon;
  expect(getStats(pokemon).speed).toBe(6);
  for (const stats of [
    pokemon.stats.slice(1),
    [...pokemon.stats, pokemon.stats[0]!],
    pokemon.stats.map((entry, index) =>
      index === 0 ? { ...entry, base_stat: 0 } : entry,
    ),
    pokemon.stats.map((entry, index) =>
      index === 0 ? { ...entry, base_stat: Number.NaN } : entry,
    ),
  ])
    expect(() => getStats({ ...pokemon, stats })).toThrow(/Invalid .* stat/);
});
