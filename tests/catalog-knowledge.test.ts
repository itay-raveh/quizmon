import type { Pokemon, PokemonSpecies } from 'pokenode-ts';
import { extractPokemonKnowledge } from '../scripts/catalog-knowledge';
import { statNames } from '../src/domain/pokemon/types';

const pokemon = {
  height: 3,
  weight: 9999,
  abilities: [
    { ability: { name: 'ordinary' }, slot: 1, is_hidden: false },
    { ability: { name: 'hidden' }, slot: 3, is_hidden: true },
  ],
  stats: statNames.map((name) => ({
    stat: { name },
    base_stat: 100,
    effort: name === 'attack' ? 2 : name === 'speed' ? 1 : 0,
  })),
} as Pokemon;
const species = {
  is_baby: false,
  evolves_from_species: null,
  egg_groups: [{ name: 'ground' }],
} as PokemonSpecies;

it('retains variety measurements, species classifications, hidden slots and split effort yields', () => {
  expect(extractPokemonKnowledge(pokemon, species)).toEqual({
    height: 3,
    weight: 9999,
    isBaby: false,
    isUnevolved: true,
    eggGroups: ['ground'],
    abilitySlots: [
      { name: 'ordinary', slot: 1, hidden: false },
      { name: 'hidden', slot: 3, hidden: true },
    ],
    evYield: {
      hp: 0,
      attack: 2,
      defense: 0,
      'special-attack': 0,
      'special-defense': 0,
      speed: 1,
    },
  });
});

it('preserves unknown facts instead of fabricating false classifications or zero yields', () => {
  const result = extractPokemonKnowledge(
    {
      ...pokemon,
      height: 0,
      weight: -1,
      stats: pokemon.stats.slice(1),
      abilities: [{ ability: { name: 'unknown' }, slot: 1 }],
    } as Pokemon,
    {} as PokemonSpecies,
  );
  expect(Object.values(result).every((value) => value === undefined)).toBe(
    true,
  );
});

it('rejects duplicate stat records rather than selecting an arbitrary effort value', () => {
  expect(
    extractPokemonKnowledge(
      { ...pokemon, stats: [...pokemon.stats, pokemon.stats[0]!] },
      species,
    ).evYield,
  ).toBeUndefined();
});
