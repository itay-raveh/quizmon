import type { GameMode, GameResult } from '../domain/quiz/types';
import { Sentry, sentryEnabled } from './sentry';

const metricScope = () => new Sentry.Scope();

const record = (send: () => void) => {
  if (!sentryEnabled) return;
  try {
    send();
  } catch {
    // Telemetry cannot affect a saved game.
  }
};

export const trackPageViewed = () => {
  if (!sentryEnabled) return;
  record(() =>
    Sentry.metrics.count('quizmon.page_view', 1, { scope: metricScope() }),
  );
};

export const trackGameStarted = (mode: GameMode, questionCount: number) =>
  record(() => {
    const options = {
      scope: metricScope(),
      attributes: { 'game.mode': mode.kind },
    };
    Sentry.metrics.count('quizmon.game_started', 1, options);
    Sentry.metrics.distribution(
      'quizmon.game.question_count',
      questionCount,
      options,
    );
  });

export const trackGameCompleted = (
  mode: GameMode['kind'],
  result: GameResult,
) =>
  record(() => {
    const options = {
      scope: metricScope(),
      attributes: {
        'game.mode': mode,
      },
    };
    Sentry.metrics.count('quizmon.game_completed', 1, options);
    Sentry.metrics.distribution('quizmon.game.score', result.score, options);
    Sentry.metrics.distribution(
      'quizmon.game.elapsed_seconds',
      result.elapsedSeconds,
      { ...options, unit: 'second' },
    );
    Sentry.metrics.distribution(
      'quizmon.game.correct_count',
      result.correctCount,
      options,
    );
    Sentry.metrics.distribution(
      'quizmon.game.question_count',
      result.questionCount,
      options,
    );
  });

export const trackFailure = (kind: string) =>
  record(() => {
    Sentry.metrics.count('quizmon.failure', 1, {
      scope: metricScope(),
      attributes: { 'error.kind': kind },
    });
    Sentry.logger.warn('quizmon.failure', { 'error.kind': kind });
  });
