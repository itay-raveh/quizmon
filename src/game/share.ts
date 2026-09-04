import { formatDailyDate, getDailyUrl } from './daily';
import { formatScore } from './format';
import { site } from '../app/site';
import type { GameMode, GameResult } from './types';

interface ShareContent {
  text: string;
  title: string;
  url: string;
}

export const buildShareContent = (
  mode: GameMode,
  result: GameResult,
): ShareContent => {
  const pattern = result.answers
    .map(({ correct }) => (correct ? '🟩' : '🟥'))
    .join('');

  return {
    text: [`${formatScore(result.score)} points`, pattern].join('\n'),
    title: `${site.name} · ${mode.kind === 'daily' ? formatDailyDate(mode.date) : 'Training'}`,
    url: mode.kind === 'daily' ? getDailyUrl(mode.date) : site.url,
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
      text: buildShareText(mode, result),
      title: content.title,
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
