import type { GameResult } from '../domain/quiz/types';

const metrics = vi.hoisted(() => ({
  count: vi.fn(),
  distribution: vi.fn(),
}));
const storage = vi.hoisted(() => new Map<string, string>());

vi.mock('./sentry', () => ({ Sentry: { metrics }, sentryEnabled: true }));
vi.mock('./storage/browser-storage', () => ({
  readStoredValue: (type: string, key: string) =>
    storage.get(`${type}:${key}`) ?? null,
  writeStoredValue: (type: string, key: string, value: string) => {
    storage.set(`${type}:${key}`, value);
    return true;
  },
}));

import {
  trackGameCompleted,
  trackGameStarted,
  trackPageViewed,
} from './analytics';

beforeEach(() => {
  metrics.count.mockReset();
  metrics.distribution.mockReset();
  storage.clear();
});

it('emits bounded game metrics without answers or player identity', () => {
  trackPageViewed(new Date('2026-09-23T12:00:00Z'));
  trackGameStarted({ kind: 'training' }, 10);
  trackGameCompleted('training', {
    score: 1200,
    correctCount: 8,
    questionCount: 10,
    elapsedSeconds: 60,
    contentVersion: 4,
    scoreVersion: 2,
    answers: [{ secret: 'never send answers' }],
  } as unknown as GameResult);

  expect(metrics.count).toHaveBeenCalledWith('quizmon.page_view');
  expect(metrics.count).toHaveBeenCalledWith('quizmon.game_completed', 1, {
    attributes: {
      'game.mode': 'training',
      'game.content_version': 4,
      'game.score_version': 2,
    },
  });
  const emitted = JSON.stringify([
    metrics.count.mock.calls,
    metrics.distribution.mock.calls,
  ]);
  expect(emitted).not.toContain('never send answers');
  expect(metrics.distribution).toHaveBeenCalledWith(
    'quizmon.game.score',
    1200,
    expect.any(Object),
  );
});

it('counts anonymous visitors once per install, UTC day, and tab session', () => {
  trackPageViewed(new Date('2026-09-23T23:59:00Z'));
  trackPageViewed(new Date('2026-09-23T23:59:30Z'));
  trackPageViewed(new Date('2026-09-24T00:00:00Z'));

  expect(metrics.count.mock.calls).toEqual([
    ['quizmon.page_view'],
    ['quizmon.visitor_first_seen'],
    ['quizmon.visitor_daily_active'],
    ['quizmon.session_started'],
    ['quizmon.page_view'],
    ['quizmon.page_view'],
    ['quizmon.visitor_daily_active'],
  ]);
});

it('keeps game actions available when telemetry throws', () => {
  metrics.count.mockImplementationOnce(() => {
    throw new Error('Sentry unavailable');
  });
  expect(() => trackGameStarted({ kind: 'training' }, 10)).not.toThrow();
});
