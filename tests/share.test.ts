import {
  buildShareContent,
  buildShareText,
  canShareResult,
  shareResult,
} from '@/game/share';
import type { GameResult } from '@/game/types';

const result: GameResult = {
  answers: [
    { category: 'identity', correct: true, points: 1_000 },
    { category: 'stat', correct: false, points: 0 },
  ],
  contentVersion: 2,
  correctCount: 1,
  elapsedSeconds: 20,
  questionCount: 2,
  score: 1_500,
  scoreVersion: 2,
};

describe('result sharing', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });

  it('includes the daily date and challenge URL without answer details', () => {
    window.history.replaceState({}, '', '/play?daily=old#answer');
    const text = buildShareText({ kind: 'daily', date: '2026-09-01' }, result);

    expect(text).toContain('Quizmon · Sep 1, 2026');
    expect(text).not.toContain('Trainer Trial');
    expect(text).toContain('1,500 points');
    expect(text).not.toContain(' / ');
    expect(text).not.toContain('1/2');
    expect(text).toContain('🟩🟥');
    expect(text).toContain('https://quizmon.raveh.dev/?daily=2026-09-01');
    expect(text).not.toContain('pikachu');
    expect(text).not.toContain('#answer');
  });

  it('keeps the title, score card, and URL as separate share fields', () => {
    const content = buildShareContent({ kind: 'training' }, result);

    expect(content.title).toBe('Quizmon · Training');
    expect(content.text).toContain('1,500 points');
    expect(content.text).not.toContain(content.url);
    expect(content.url).toBe('https://quizmon.raveh.dev/');
  });

  it('includes the dated challenge link in the native share payload', async () => {
    const share = vi
      .fn<(data: ShareData) => Promise<void>>()
      .mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    await expect(
      shareResult({ kind: 'daily', date: '2026-09-01' }, result),
    ).resolves.toBe('shared');
    expect(canShareResult()).toBe(true);
    expect(share.mock.calls[0]?.[0]).toEqual({
      text: [
        'Quizmon · Sep 1, 2026',
        '1,500 points',
        '🟩🟥',
        'https://quizmon.raveh.dev/?daily=2026-09-01',
      ].join('\n'),
      title: 'Quizmon · Sep 1, 2026',
    });
  });

  it('opens fallback options instead of copying when native sharing is absent', async () => {
    expect(canShareResult()).toBe(false);
    await expect(shareResult({ kind: 'training' }, result)).resolves.toBe(
      'unsupported',
    );
  });
});
