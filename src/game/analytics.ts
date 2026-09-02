import type { GameMode, GameResult } from './types';

export const trackGameCompleted = (mode: GameMode, result: GameResult) => {
  const payload = {
    contentVersion: result.contentVersion,
    correctCount: result.correctCount,
    elapsedSeconds: result.elapsedSeconds,
    mode: mode.kind,
    questionCount: result.questionCount,
    score: result.score,
    scoreVersion: result.scoreVersion,
  };

  void fetch('/api/events/game-completed', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => undefined);
};
