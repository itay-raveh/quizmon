import { getDailyUrl, getModeLabel } from './daily';
import type { GameMode, GameResult } from './types';

export interface ShareContent {
  text: string;
  title: string;
  url: string;
}

export const buildShareContent = (
  mode: GameMode,
  result: GameResult,
): ShareContent => {
  const score = Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(result.score);
  const pattern = result.answers
    .map(({ correct }) => (correct ? '🟦' : '⬜'))
    .join('');

  return {
    text: [
      `${score} / ${result.questionCount * 100} points · ${result.correctCount}/${result.questionCount}`,
      pattern,
    ].join('\n'),
    title: `Quizmon · ${getModeLabel(mode)}`,
    url:
      mode.kind === 'daily'
        ? getDailyUrl(mode.date)
        : new URL('/', window.location.origin).toString(),
  };
};

export const buildShareText = (mode: GameMode, result: GameResult): string => {
  const content = buildShareContent(mode, result);
  return [content.title, content.text, content.url].join('\n');
};

export const canShareResult = (): boolean =>
  typeof navigator.share === 'function';

export const shareResult = async (
  mode: GameMode,
  result: GameResult,
): Promise<'shared' | 'unsupported' | 'cancelled'> => {
  if (!canShareResult()) return 'unsupported';

  const content = buildShareContent(mode, result);

  try {
    await navigator.share({
      text: `${content.title}\n${content.text}`,
      title: content.title,
      url: content.url,
    });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    throw error;
  }
};

export const copyResult = (mode: GameMode, result: GameResult): Promise<void> =>
  navigator.clipboard.writeText(buildShareText(mode, result));
