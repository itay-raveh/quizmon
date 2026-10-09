import { expect, test } from 'vitest';
import { createTrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { LEAGUE_QUESTION_COUNT } from '../src/domain/quiz/league.ts';
import { projectTrainerHistory } from './rxdb-read.ts';

test('public player profiles mark only perfect League winners as Champions', () => {
  const answer = () => ({
    type: 'pokemonFromHistoricalSprite' as const,
    subject: 'pikachu',
    expected: ['pikachu'],
    selected: ['pikachu'],
    responseMs: 1000,
  });
  const victory = {
    id: '00000000-0000-4000-8000-000000000001',
    mode: 'league' as const,
    completedAt: '2026-10-02T00:00:00.000Z',
    answers: Array.from({ length: LEAGUE_QUESTION_COUNT }, answer),
  };
  const rounds = [
    { ownerId: 'winner', ...victory },
    {
      ownerId: 'runner-up',
      ...victory,
      id: '00000000-0000-4000-8000-000000000002',
      answers: [
        ...victory.answers.slice(1),
        { ...answer(), selected: ['eevee'] },
      ],
    },
  ];
  const winner = projectTrainerHistory(createTrainerProfile(), [rounds[0]!]);
  const runnerUp = projectTrainerHistory(createTrainerProfile(), [rounds[1]!]);
  expect(winner.stats.leagueCompleted).toBe(true);
  expect(runnerUp.stats.leagueCompleted).toBe(false);
});
