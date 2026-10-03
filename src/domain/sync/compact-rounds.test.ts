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

  expect(round.mode).toBe('training');
  if (round.mode !== 'training') throw new Error('Expected Training round');
  expect(scoreCompactRound(round).score).toBe(completed.result.score);
  expect(scoreCompactRound(round).rules?.level).toBe(completed.training.level);
  expect(round.answers[0]?.options).toEqual(
    completed.result.answers[0]?.observation?.options,
  );
  expect(round.answers[1]?.options).toBeUndefined();
  expect(JSON.stringify(round)).not.toContain('Choose the matching answer');

  completed.training.level = undefined;
  expect(() => compactCompletion(completed)).toThrow();
});
