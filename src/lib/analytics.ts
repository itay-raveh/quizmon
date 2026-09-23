import type { GameMode, GameResult } from '../domain/quiz/types';
import { Sentry, sentryEnabled } from './sentry';
import { readStoredValue, writeStoredValue } from './storage/browser-storage';

const FIRST_VISIT_KEY = 'quizmon.analytics.first-visit.v1';
const DAILY_VISIT_KEY = 'quizmon.analytics.daily-visit.v1';
const SESSION_KEY = 'quizmon.analytics.session.v1';

const record = (send: () => void) => {
  if (!sentryEnabled) return;
  try {
    send();
  } catch {
    // Telemetry cannot affect a saved game.
  }
};

const trackOnce = (
  storage: 'localStorage' | 'sessionStorage',
  key: string,
  value: string,
  metric: string,
) => {
  if (readStoredValue(storage, key) === value) return;
  if (!writeStoredValue(storage, key, value)) return;
  record(() => Sentry.metrics.count(metric));
};

export const trackPageViewed = (now = new Date()) => {
  if (!sentryEnabled) return;
  record(() => Sentry.metrics.count('quizmon.page_view'));
  trackOnce('localStorage', FIRST_VISIT_KEY, '1', 'quizmon.visitor_first_seen');
  trackOnce(
    'localStorage',
    DAILY_VISIT_KEY,
    now.toISOString().slice(0, 10),
    'quizmon.visitor_daily_active',
  );
  trackOnce('sessionStorage', SESSION_KEY, '1', 'quizmon.session_started');
};

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
