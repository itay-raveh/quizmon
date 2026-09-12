import { saveResult } from '@/lib/storage/results-storage';
import { readDailyState } from './daily-state';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

it('keeps legacy and track results for the requested date', () => {
  for (const [date, track] of [
    ['2026-09-01', undefined],
    ['2026-09-01', { difficulty: 1, scope: 'gen-i' }],
    ['2026-09-01', { difficulty: 3, scope: 'all' }],
    ['2026-08-31', { difficulty: 5, scope: 'all' }],
  ] as const) {
    saveResult(
      { kind: 'daily', date, track },
      {
        answers: [],
        contentVersion: 1,
        correctCount: 0,
        elapsedSeconds: 10,
        questionCount: 5,
        score: 0,
        ...(track ? { dailyTrack: track } : {}),
      },
    );
  }
  const state = readDailyState('2026-09-01');
  expect(state.completed.map((result) => result.dailyTrack)).toEqual([
    undefined,
    { difficulty: 1, scope: 'gen-i' },
    { difficulty: 3, scope: 'all' },
  ]);
  expect(state.readError).toBe(false);
});

it('reports an unreadable save without overwriting it', () => {
  localStorage.setItem('quizmon.player', '{broken');
  expect(readDailyState('2026-09-01')).toMatchObject({
    readError: true,
    completed: [],
    attempts: {},
  });
  expect(localStorage.getItem('quizmon.player')).toBe('{broken');
});
