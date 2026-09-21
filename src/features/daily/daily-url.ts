import { site } from '../../app/site';

export const getDailyUrl = (date: string): string => {
  const url = new URL(site.url);
  url.searchParams.set('daily', date);
  return url.toString();
};
