import type { GameResult } from '../domain/quiz/types';

const metrics = vi.hoisted(() => ({
  count: vi.fn(),
  distribution: vi.fn(),
}));

vi.mock('./sentry', () => ({ Sentry: { metrics }, sentryEnabled: true }));

import {
  trackGameCompleted,
  trackGameStarted,
  trackPageViewed,
} from './analytics';

it('emits bounded game metrics without answers or player identity', () => {
  trackPageViewed();
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

it('keeps game actions available when telemetry throws', () => {
  metrics.count.mockImplementationOnce(() => {
    throw new Error('Sentry unavailable');
  });
  expect(() => trackGameStarted({ kind: 'training' }, 10)).not.toThrow();
});
