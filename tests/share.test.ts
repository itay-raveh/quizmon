import { buildShareText } from '@/game/share';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  correctCount: 8,
  elapsedSeconds: 20,
  questionCount: 10,
  score: 2560,
};

describe('result sharing', () => {
  it('includes the daily date and challenge URL without answer details', () => {
    window.history.replaceState({}, '', '/play?daily=old#answer');
    const text = buildShareText({ kind: 'daily', date: '2026-09-01' }, result);

    expect(text).toContain('Daily challenge');
    expect(text).toContain('8/10 · 80% · 2,560 points');
    expect(text).toContain('?daily=2026-09-01');
    expect(text).not.toContain('pikachu');
    expect(text).not.toContain('#answer');
  });
});
