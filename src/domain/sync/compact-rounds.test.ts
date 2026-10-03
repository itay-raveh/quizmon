import { expect, it } from 'vitest';
import { completion } from '../../../tests/online/progress-fixtures.ts';
import {
  compactCompletion,
  compactRoundSchema,
  scoreCompactRound,
} from './compact-rounds.ts';

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
  expect(JSON.stringify(round)).not.toContain('scoreVersion');
  expect(JSON.stringify(round)).not.toContain('ruleLevel');
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

it('rescored rounds ignore old scoring fields', () => {
  const round = compactCompletion(completion());
  if (round.mode !== 'training') throw new Error('Expected Training round');
  const saved = compactRoundSchema.parse({
    ...round,
    training: { ...round.training, scoreVersion: 2 },
    answers: round.answers.map((answer) => ({ ...answer, ruleLevel: 1 })),
  });
  expect(saved).toEqual(round);
  expect(scoreCompactRound(saved).score).toBe(scoreCompactRound(round).score);
});

it('rebuilds old Daily scores with the Level 3 question awards', () => {
  const old = completion('daily', { assistsUsed: 2 });
  old.result.score = 1;
  old.result.answers.forEach((answer) => {
    answer.points = 1;
    answer.speedBonus = 1;
  });
  const daily = compactCompletion(old);
  if (daily.mode !== 'daily') throw new Error('Expected Daily round');
  const rescored = scoreCompactRound(daily);
  const training = scoreCompactRound(compactCompletion(completion('training')));
  const unassisted = scoreCompactRound(
    compactCompletion(completion('daily', { assistsUsed: 0 })),
  );

  expect(rescored.score).not.toBe(old.result.score);
  expect(rescored.answers[0]?.points).toBe(training.answers[0]?.points);
  expect(rescored.answers[0]?.speedBonus).toBe(training.answers[0]?.speedBonus);
  expect(rescored.answers.at(-1)?.points).toBeLessThan(
    unassisted.answers.at(-1)!.points,
  );
  expect(
    rescored.answers.reduce(
      (sum, answer) => sum + answer.points + (answer.speedBonus ?? 0),
      0,
    ),
  ).toBe(rescored.score);
});

it('uses the same scorer for League stages and its Champion finale', () => {
  const league = scoreCompactRound(compactCompletion(completion('league')));
  const training = scoreCompactRound(compactCompletion(completion('training')));
  expect(league.answers[0]?.points).toBeLessThan(training.answers[0]!.points);
  expect(league.answers.at(-1)?.points).toBeGreaterThan(
    training.answers[0]!.points,
  );
  expect(
    league.answers.reduce(
      (sum, answer) => sum + answer.points + (answer.speedBonus ?? 0),
      0,
    ),
  ).toBe(league.score);
});
