import { getDailyUrl, getModeLabel } from './daily';
import type { GameMode, GameResult } from './types';

export const buildShareText = (mode: GameMode, result: GameResult): string => {
  const score = Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(result.score);
  const accuracy = Math.round(
    (result.correctCount / result.questionCount) * 100,
  );

  return [
    `Quizmon · ${getModeLabel(mode)}`,
    `${result.correctCount}/${result.questionCount} · ${accuracy}% · ${score} points`,
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
