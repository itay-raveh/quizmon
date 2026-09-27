import type { GameResult } from '../domain/quiz/types';

const metrics = vi.hoisted(() => ({
  count: vi.fn(),
  distribution: vi.fn(),
}));
type MetricCall = [
  string,
  number,
  { scope: object; attributes?: Record<string, string> },
];
const countCalls = () => metrics.count.mock.calls as MetricCall[];

vi.mock('./sentry', () => ({
  Sentry: { Scope: class {}, metrics },
  sentryEnabled: true,
}));
import {
  trackGameCompleted,
  trackGameStarted,
  trackPageViewed,
} from './analytics';

beforeEach(() => {
  metrics.count.mockReset();
  metrics.distribution.mockReset();
});

it('emits bounded game metrics without answers or player identity', () => {
  trackPageViewed();
  trackGameStarted({ kind: 'training' }, 10);
  trackGameCompleted('training', {
    score: 1200,
    correctCount: 8,
    questionCount: 10,
    elapsedSeconds: 60,
    answers: [{ secret: 'never send answers' }],
  } as unknown as GameResult);

  expect(
    countCalls().some(
      ([name, value, options]) =>
        name === 'quizmon.page_view' && value === 1 && !!options.scope,
    ),
  ).toBe(true);
  expect(
    countCalls().some(
      ([name, value, options]) =>
        name === 'quizmon.game_completed' &&
        value === 1 &&
        options.attributes?.['game.mode'] === 'training' &&
        !!options.scope,
    ),
  ).toBe(true);
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

it('counts page views without storing visitor markers', () => {
  trackPageViewed();
  trackPageViewed();
  trackPageViewed();

  expect(countCalls().map(([name]) => name)).toEqual([
    'quizmon.page_view',
    'quizmon.page_view',
    'quizmon.page_view',
  ]);
  expect(new Set(countCalls().map(([, , options]) => options.scope)).size).toBe(
    countCalls().length,
  );
});

it('keeps game actions available when telemetry throws', () => {
  metrics.count.mockImplementationOnce(() => {
    throw new Error('Sentry unavailable');
  });
  expect(() => trackGameStarted({ kind: 'training' }, 10)).not.toThrow();
});
