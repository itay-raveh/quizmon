import { expect, it } from 'vitest';
import { completion } from '../../../tests/online/progress-fixtures.ts';
import { compactCompletion, scoreCompactRound } from './compact-rounds.ts';

it('retains the scoring inputs without archiving question presentation', () => {
  const completed = completion();
  completed.result.answers[0]!.observation!.options = [
    'bulbasaur',
    'ivysaur',
    'venusaur',
    'pikachu',
  ];
  completed.result.answers[1]!.observation!.interaction = 'search';
  completed.result.answers[1]!.observation!.options = [
    'bulbasaur',
    'ivysaur',
    'venusaur',
    'pikachu',
  ];
  const round = compactCompletion(completed);

  expect(scoreCompactRound(round).score).toBe(completed.result.score);
  expect(scoreCompactRound(round).rules?.difficulty).toBe(
    completed.training.difficulty,
  );
  expect(round.answers[0]?.options).toEqual(
    completed.result.answers[0]?.observation?.options,
  );
  expect(round.answers[1]?.options).toBeUndefined();
  expect(JSON.stringify(round)).not.toContain('Choose the matching answer');

  completed.training.difficulty = undefined;
  expect(JSON.stringify(compactCompletion(completed))).not.toContain(
    'difficulty',
  );
});
