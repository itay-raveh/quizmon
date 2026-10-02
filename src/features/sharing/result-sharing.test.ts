import { afterEach, expect, test, vi } from 'vitest';
import { site } from '@/app/site';
import { formatDailyDate } from '@/domain/quiz/format';
import type { GameResult } from '@/domain/quiz/types';
import { copyResult } from './result-sharing';

afterEach(() => vi.unstubAllGlobals());

test('copied Daily results keep their date and open Quizmon', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const result: GameResult = {
    answers: [{ category: 'identity', correct: true, points: 100 }],
    correctCount: 1,
    elapsedSeconds: 10,
    questionCount: 1,
    score: 100,
  };

  await copyResult({ kind: 'daily', date: '2026-09-08' }, result);

  const shared = vi.mocked(writeText).mock.calls[0]?.[0] as string;
  expect(shared).toContain(formatDailyDate('2026-09-08'));
  expect(shared).toContain('100 points\n🟩');
  expect(shared.trimEnd().endsWith(site.url)).toBe(true);
  expect(shared).not.toContain('/daily/');
});
