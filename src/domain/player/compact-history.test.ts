import { expect, it } from 'vitest';
import { projectCompactRoundHistory } from './compact-history.ts';
import {
  compactCompletion,
  compactRoundSchema,
  scoreCompactRound,
  type CompactRound,
} from '../sync/compact-rounds.ts';
import { completion } from '../../../tests/online/progress-fixtures.ts';

it('credits the earliest completed Daily while retaining discoveries from both attempts', () => {
  const answer = (subject: string, options: string[], responseMs = 1000) => ({
    type: 'pokemonFromHistoricalSprite' as const,
    subject,
    ...(options.length ? { options } : {}),
    expected: [subject],
    selected: [subject],
    responseMs,
  });
  const earlier: CompactRound = {
    id: '00000000-0000-4000-8000-000000000001',
    mode: 'daily',
    day: '2026-09-11',
    completedAt: '2026-09-11T23:59:00.000Z',
    answers: Array.from({ length: 5 }, () => answer('pikachu', [])),
  };
  const receivedFirst: CompactRound = {
    ...earlier,
    id: '00000000-0000-4000-8000-000000000002',
    completedAt: '2026-09-12T00:01:00.000Z',
    answers: [
      answer('eevee', ['bulbasaur', 'ivysaur', 'venusaur', 'charmander'], 2000),
      ...earlier.answers.slice(1),
    ],
  };

  const projected = projectCompactRoundHistory(
    [receivedFirst, earlier],
    'Trainer',
  );

  expect(projected.results.daily['2026-09-11']?.score).toBe(
    scoreCompactRound(earlier).score,
  );
  expect(projected.results.streak.creditedDates).toEqual(['2026-09-11']);
  expect(projected.pokedex).toEqual([
    'pikachu',
    'bulbasaur',
    'charmander',
    'eevee',
    'ivysaur',
    'venusaur',
  ]);
});

it('compares older Training rounds using the current scoring rules', () => {
  const current = compactCompletion(completion());
  if (current.mode !== 'training') throw new Error('Expected Training round');
  const older = compactRoundSchema.parse({
    ...current,
    id: crypto.randomUUID(),
    completedAt: '2026-09-12T10:00:00.000Z',
    training: {
      level: current.training.level,
      generations: current.training.generations,
      formGroups: current.training.formGroups,
    },
    answers: current.answers.map((answer) => ({ ...answer, responseMs: 0 })),
  });
  const oldOnly = projectCompactRoundHistory([older], 'Trainer');
  expect(oldOnly.results.training.score?.score).toBe(
    scoreCompactRound(older).score,
  );
  expect(oldOnly.results.progress.masteryRounds).toBeGreaterThan(0);
  const combined = projectCompactRoundHistory([current, older], 'Trainer');
  expect(combined.results.training.score?.score).toBe(
    scoreCompactRound(older).score,
  );
});

it('keeps an unknown format in place without awarding points or progress', () => {
  const original = compactCompletion(completion());
  if (original.mode !== 'training') throw new Error('Expected Training round');
  const unknown = compactRoundSchema.parse({
    ...original,
    answers: [
      {
        ...original.answers[0],
        type: 'removed-format',
        subject: 'eevee',
        expected: ['eevee'],
        selected: ['eevee'],
      },
      ...original.answers.slice(1),
    ],
  });
  const missed = compactRoundSchema.parse({
    ...original,
    answers: [
      { ...original.answers[0], selected: [] },
      ...original.answers.slice(1),
    ],
  });
  const result = scoreCompactRound(unknown);
  const projected = projectCompactRoundHistory([unknown], 'Trainer');

  expect(result.answers).toHaveLength(10);
  expect(result.answers[0]).toMatchObject({ correct: false, points: 0 });
  expect(result.answers[0]?.questionType).toBeUndefined();
  expect(result.score).toBe(scoreCompactRound(missed).score);
  expect(projected.results.progress.correctQuestionTypes.pokemonTypes).toBe(9);
  expect(projected.pokedex).not.toContain('eevee');
  expect(
    compactRoundSchema.safeParse({
      ...unknown,
      answers: [
        { ...unknown.answers[0], responseMs: -1 },
        ...unknown.answers.slice(1),
      ],
    }).success,
  ).toBe(false);
});
