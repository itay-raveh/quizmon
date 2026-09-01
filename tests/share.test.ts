import { buildShareText } from '@/game/share';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  answers: [
    { category: 'identity', correct: true, points: 100 },
    { category: 'scale', correct: false, points: 0 },
  ],
  contentVersion: 2,
  correctCount: 1,
  elapsedSeconds: 20,
  questionCount: 2,
  score: 100,
};

describe('result sharing', () => {
  it('includes the daily date and challenge URL without answer details', () => {
    window.history.replaceState({}, '', '/play?daily=old#answer');
    const text = buildShareText({ kind: 'daily', date: '2026-09-01' }, result);

    expect(text).toContain('Trainer Trial');
    expect(text).toContain('100 / 200 points · 1/2');
    expect(text).toContain('🟦⬜');
    expect(text).toContain('?daily=2026-09-01');
    expect(text).not.toContain('pikachu');
    expect(text).not.toContain('#answer');
  });
});
