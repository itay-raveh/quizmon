import catalog from '../pokemon/data/pokemon.json';
import pokemonGenerations from '../pokemon/data/pokemon-generations.json';
import { gameVersions } from '../versions';
import { completionCompatibility } from './compatibility';

const current = {
  contentVersion: gameVersions.content,
  scoreVersion: gameVersions.score,
  progressVersion: gameVersions.progress,
  generatorVersion: 0,
  mode: 'daily',
  result: { rules: { version: gameVersions.content } },
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

test('retains older Daily completion metadata in personal history', () => {
  expect(
    completionCompatibility({
      ...current,
      generatorVersion: 19,
      result: { rules: { version: 19 } },
    }),
  ).toEqual(completionCompatibility(current));
});

test.each([
  { contentVersion: 17 },
  { scoreVersion: 2 },
  { progressVersion: 2 },
  { mode: 'unknown' },
])('rejects a completion outside the current baseline: %j', (patch) => {
  expect(completionCompatibility({ ...current, ...patch })).toBeUndefined();
});

test.each([
  ['training', 0, 10],
  ['daily', 0, 5],
  ['league', 0, 15],
])('validates the %s question count', (mode, generatorVersion, count) => {
  expect(
    completionCompatibility({ ...current, mode, generatorVersion })
      ?.questionCount,
  ).toBe(count);
});
