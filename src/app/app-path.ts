import { isDailyDate } from '../lib/validation';

export const isAppPath = (pathname: string): boolean =>
  pathname === '/' ||
  /^\/(?:trainer(?:\/(?:edit|badges|titles|pokedex))?|league|account(?:\/friends)?|rankings|players\/[^/]+)$/.test(
    pathname,
  ) ||
  (pathname.startsWith('/daily/') &&
    isDailyDate(pathname.slice('/daily/'.length)));
