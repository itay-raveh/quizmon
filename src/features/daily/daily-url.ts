import { site } from '../../app/site';

export const getDailyUrl = (date: string): string => {
  return new URL(`/daily/${date}`, site.url).toString();
};
