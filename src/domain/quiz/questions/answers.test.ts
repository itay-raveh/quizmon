import pokemonData from '../../pokemon/data/pokemon.json' with { type: 'json' };
import type { PokemonCatalog } from '../../pokemon/types.ts';
import { createSeededRandom } from '../../../lib/random.ts';
import { emptyQuestionHistory } from '../history.ts';
import { chooseSampledMultiCorrectCount } from './answers.ts';
import { buildQuestionType } from './registry.ts';

const catalog = pokemonData as unknown as PokemonCatalog;
const pool = Object.entries(catalog.pokemon).map(([name, pokemon]) => ({
  name,
  pokemon,
}));
const context = { catalog, pool, used: new Set<string>() };

it('weights feasible answer counts toward two and three', () => {
  const counts = [0, 0, 0, 0];
  for (let index = 0; index < 100; index++) {
    const count = chooseSampledMultiCorrectCount(
      { ...context, random: () => (index + 0.5) / 100 },
      4,
      4,
    )!;
    counts[count - 1]!++;
  }
  expect(counts).toEqual([15, 35, 35, 15]);
});

it('renormalizes over feasible counts and rejects an insufficient pool', () => {
  const draw = (matching: number, other: number, random: number) =>
    chooseSampledMultiCorrectCount(
      { ...context, random: () => random },
      matching,
      other,
    );
  expect(draw(2, 3, 0.29)).toBe(1);
  expect(draw(2, 3, 0.31)).toBe(2);
  expect(draw(4, 0, 0)).toBe(4);
  expect(draw(4, 0, 0.99)).toBe(4);
  expect(draw(0, 4, 0.5)).toBeUndefined();
  expect(draw(1, 2, 0.5)).toBeUndefined();
});

it('preserves the initial answer count when history chooses fresher drafts', () => {
  const history = emptyQuestionHistory();
  history.sequence = pool.length;
  pool.forEach(({ name }, index) => {
    history.pokemon[name] = index + 1;
  });
  for (const family of [
    'pokemonByGeneration',
    'pokemonByType',
    'legendaryMythicalSelection',
  ] as const) {
    for (let seed = 0; seed < 12; seed++) {
      const build = (withHistory: boolean) =>
        buildQuestionType(
          {
            ...context,
            used: new Set(),
            level: 3,
            random: createSeededRandom(`${family}-${seed}`),
            history: withHistory ? structuredClone(history) : undefined,
          },
          family,
        );
      const initial = build(false)!;
      const fresh = build(true)!;
      expect(initial).toBeDefined();
      expect(fresh).toBeDefined();
      expect(fresh.options).toHaveLength(4);
      expect(fresh.answer.correctOptions).toHaveLength(
        initial.answer.correctOptions.length,
      );
    }
  }
});
