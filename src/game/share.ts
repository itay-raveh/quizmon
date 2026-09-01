import { getDailyUrl, getModeLabel } from './daily';
import type { GameMode, GameResult } from './types';

export const buildShareText = (mode: GameMode, result: GameResult): string => {
  const score = Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(result.score);
  const pattern = result.answers
    .map(({ correct }) => (correct ? '🟦' : '⬜'))
    .join('');

  return [
    `Quizmon · ${getModeLabel(mode)}`,
    `${score} / ${result.questionCount * 100} points · ${result.correctCount}/${result.questionCount}`,
    pattern,
    mode.kind === 'daily'
      ? getDailyUrl(mode.date)
      : new URL('/', window.location.origin).toString(),
  ].join('\n');
};

export const shareResult = async (
  mode: GameMode,
  result: GameResult,
): Promise<'shared' | 'copied' | 'cancelled'> => {
  const text = buildShareText(mode, result);

  if (navigator.share) {
    try {
      await navigator.share({ text, title: 'Quizmon result' });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  await navigator.clipboard.writeText(text);
  return 'copied';
};
