import { isDailyDate } from '../lib/validation';

export const isGamePath = (pathname: string): boolean =>
  pathname === '/' ||
  /^\/(?:trainer(?:\/(?:edit|badges|titles|pokedex))?|league\/(?:challenge|hall-of-fame)|account|social\/(?:friends|rankings|players\/[^/]+))$/.test(
    pathname,
  ) ||
  (pathname.startsWith('/daily/') &&
    isDailyDate(pathname.slice('/daily/'.length)));
