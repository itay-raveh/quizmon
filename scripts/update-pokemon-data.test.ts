import type { Pokemon } from 'pokenode-ts';
import { statNames } from '../src/domain/pokemon/types';
import { getCurrentBackSprite, getStats } from './update-pokemon-data';

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

it('imports the supplied form pair and rejects pairing a changed front with the shipped artwork', () => {
  const front =
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10115.png';
  const back =
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/10115.png';
  const sprites = { front_default: front, back_default: back };
  expect(getCurrentBackSprite(sprites)).toBe('/sprites/pokemon/back/10115.png');
  expect(getCurrentBackSprite({ ...sprites, back_default: null })).toBeNull();
  expect(
    getCurrentBackSprite(sprites, '/sprites/pokemon/10217.png'),
  ).toBeNull();
  expect(() =>
    getCurrentBackSprite({
      ...sprites,
      back_default: 'https://other.example/10115.png',
    }),
  ).toThrow();
  expect(() =>
    getCurrentBackSprite({ ...sprites, back_default: front }),
  ).toThrow();
});
