import { normalizeResults } from './results';

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
])('normalizes progress counts for %s', (value, expected) => {
  const { progress } = normalizeResults({
    progress: {
      correctPokemon: [],
      correctCategories: {},
      quickAttackCompleted: false,
      championAnswersWithoutClues: value,
      masteryRounds: value,
    },
  });
  expect(progress.championAnswersWithoutClues).toBe(expected);
  expect(progress.masteryRounds).toBe(expected);
});

it('does not invent Quick Attack rounds from the retired boolean counter', () => {
  const legacy = {
    correctPokemon: [],
    correctCategories: {},
    quickAttackCompleted: true,
  };
  expect(
    normalizeResults({ progress: legacy }).progress.quickAttackRounds,
  ).toBe(0);
  expect(
    normalizeResults({ progress: { ...legacy, quickAttackRounds: 17 } })
      .progress.quickAttackRounds,
  ).toBe(17);
  expect(
    normalizeResults(normalizeResults({ progress: legacy })).progress
      .quickAttackRounds,
  ).toBe(0);
});
