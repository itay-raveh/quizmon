import type { GameMode, GameResult } from '../domain/quiz/types';
import { Sentry, sentryEnabled } from './sentry';

const record = (send: () => void) => {
  if (!sentryEnabled) return;
  try {
    send();
  } catch {
    // Telemetry cannot affect a saved game.
  }
};

export const trackPageViewed = () =>
  record(() => Sentry.metrics.count('quizmon.page_view'));

export const trackGameStarted = (mode: GameMode, questionCount: number) =>
  record(() => {
    const options = { attributes: { 'game.mode': mode.kind } };
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
      attributes: {
        'game.mode': mode,
        'game.content_version': result.contentVersion,
        'game.score_version': result.scoreVersion,
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
      attributes: { 'error.kind': kind },
    });
    Sentry.logger.warn('quizmon.failure', { 'error.kind': kind });
  });
