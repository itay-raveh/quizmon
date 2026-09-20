import catalog from '../pokemon/data/pokemon.json';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json';
import { gameVersions } from '../versions';
import { completionCompatibility } from './compatibility';

const current = {
  contentVersion: gameVersions.content,
  scoreVersion: gameVersions.score,
  progressVersion: gameVersions.progress,
  generatorVersion: gameVersions.daily,
  mode: 'daily',
  result: { rules: { version: gameVersions.questions } },
};

test('uses only shipped Pokémon names and generations for sync validation', () => {
  expect(pokemonGenerations).toEqual(
    Object.fromEntries(
      Object.entries(catalog.pokemon).map(([name, pokemon]) => [
        name,
        pokemon.generation,
      ]),
    ),
  );
  expect(completionCompatibility(current)?.pokemonGenerations).toEqual(
    pokemonGenerations,
  );
});

test.each([
  { contentVersion: 17 },
  { scoreVersion: 2 },
  { progressVersion: 2 },
  { generatorVersion: 15 },
  { result: { rules: { version: 15 } } },
  { result: {} },
  { generatorVersion: 999 },
  { mode: 'unknown' },
])('rejects a completion outside the current baseline: %j', (patch) => {
  expect(completionCompatibility({ ...current, ...patch })).toBeUndefined();
});

test.each([
  ['training', 0, 10],
  ['daily', gameVersions.daily, 5],
  ['league', gameVersions.league, 15],
])(
  'validates the current %s generator and question count',
  (mode, generatorVersion, count) => {
    expect(
      completionCompatibility({ ...current, mode, generatorVersion })
        ?.questionCount,
    ).toBe(count);
  },
);
