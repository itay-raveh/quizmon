import type { GameResult } from '@/domain/quiz/types';
import { site } from '../../app/site';

export const getDailyUrl = (date: string, result?: GameResult): string => {
  const url = new URL(site.url);
  url.searchParams.set('daily', date);
  if (result?.dailyTrack && result.rules) {
    url.searchParams.set('level', String(result.dailyTrack.difficulty));
    url.searchParams.set('scope', result.dailyTrack.scope);
    url.searchParams.set('rules', String(result.rules.version));
    url.searchParams.set('catalog', String(result.contentVersion));
  }
  return url.toString();
};
