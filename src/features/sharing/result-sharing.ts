import { dailyTrackLabel } from '@/domain/quiz/daily-track';
import { site } from '@/app/site';
import {
  formatDailyDate,
  formatScore,
  getModeLabel,
} from '@/domain/pokemon/format';
import type { GameMode, GameResult } from '@/domain/quiz/types';
import { getDailyUrl } from '../daily/daily-url';

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
    text: [
      result.dailyTrack
        ? dailyTrackLabel(result.dailyTrack)
        : result.rules
          ? `Level ${result.rules.difficulty} · Gen ${result.rules.generations.join(', ')} · ${result.rules.formGroups.join(', ')} forms`
          : null,
      `${formatScore(result.score)} points`,
      pattern,
    ]
      .filter(Boolean)
      .join('\n'),
    title: `${site.name} · ${
      mode.kind === 'daily' ? formatDailyDate(mode.date) : getModeLabel(mode)
    }`,
    url: mode.kind === 'daily' ? getDailyUrl(mode.date, result) : site.url,
  };
};

export const buildShareText = (content: ShareContent): string =>
  [content.title, content.text, content.url].join('\n');

export const canShareResult = (): boolean =>
  typeof navigator.share === 'function';

export const shareContent = async (
  data: ShareData,
): Promise<'shared' | 'cancelled'> => {
  try {
    await navigator.share(data);
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    throw error;
  }
};

export const shareResult = async (
  mode: GameMode,
  result: GameResult,
): Promise<'shared' | 'unsupported' | 'cancelled'> => {
  if (!canShareResult()) return 'unsupported';
  const content = buildShareContent(mode, result);
  return shareContent({
    text: buildShareText(content),
    title: content.title,
  });
};

export const copyResult = (mode: GameMode, result: GameResult): Promise<void> =>
  navigator.clipboard.writeText(
    buildShareText(buildShareContent(mode, result)),
  );
