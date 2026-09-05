import type { GameMode, GameResult } from './types';

type AnalyticsEvent =
  | { type: 'page_view' }
  | {
      mode: GameMode['kind'];
      questionCount: number;
      type: 'game_started';
    }
  | ({
      mode: GameMode['kind'];
      type: 'game_completed';
    } & Omit<GameResult, 'answers'>);

const trackEvent = (event: AnalyticsEvent) => {
  void fetch('/api/events', {
    body: JSON.stringify(event),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => undefined);
};

export const trackPageViewed = () => trackEvent({ type: 'page_view' });

export const trackGameStarted = (mode: GameMode, questionCount: number) =>
  trackEvent({
    mode: mode.kind,
    questionCount,
    type: 'game_started',
  });

export const trackGameCompleted = (mode: GameMode, result: GameResult) =>
  trackEvent({
    contentVersion: result.contentVersion,
    correctCount: result.correctCount,
    elapsedSeconds: result.elapsedSeconds,
    mode: mode.kind,
    questionCount: result.questionCount,
    score: result.score,
    scoreVersion: result.scoreVersion,
    type: 'game_completed',
  });
