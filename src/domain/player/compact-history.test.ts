import { expect, it } from 'vitest';
import { projectCompactRoundHistory } from './compact-history.ts';
import {
  scoreCompactRound,
  type CompactRound,
} from '../sync/compact-rounds.ts';

it('credits the first received Daily while retaining discoveries from both attempts', () => {
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
    [earlier, receivedFirst],
    'Trainer',
    new Set([receivedFirst.id]),
  );

  expect(projected.results.daily['2026-09-11']?.score).toBe(
    scoreCompactRound(receivedFirst).score,
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
