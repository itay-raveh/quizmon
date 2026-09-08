import { normalizeResults } from '@/game/results-data';

it.each([
  [undefined, 0],
  [null, 0],
  ['3', 0],
  [-1, 0],
  [-0, 0],
  [0, 0],
  [3.75, 3],
  [8, 8],
  [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1],
  [Number.NaN, 0],
  [Number.POSITIVE_INFINITY, 0],
  [Number.NEGATIVE_INFINITY, 0],
])(
  'preserves legacy progress count normalization for %s',
  (value, expected) => {
    const { progress } = normalizeResults({
      progress: {
        version: 2,
        correctPokemon: [],
        correctCategories: {},
        quickAttackCompleted: false,
        championAnswersWithoutClues: value,
        masteryRounds: value,
      },
    });
    expect(progress.championAnswersWithoutClues).toBe(expected);
    expect(progress.masteryRounds).toBe(expected);
  },
);

it('credits one historical Quick Attack and preserves new round totals', () => {
  const legacy = {
    version: 2,
    correctPokemon: [],
    correctCategories: {},
    quickAttackCompleted: true,
  };
  expect(
    normalizeResults({ progress: legacy }).progress.quickAttackRounds,
  ).toBe(1);
  expect(
    normalizeResults({ progress: { ...legacy, quickAttackRounds: 17 } })
      .progress.quickAttackRounds,
  ).toBe(17);
  expect(
    normalizeResults(normalizeResults({ progress: legacy })).progress
      .quickAttackRounds,
  ).toBe(1);
});
