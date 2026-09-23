import { isGamePath } from '../../app/game-path';

export function accountReturnPath(href: string): string {
  const current = new URL(href);
  const returnTo = current.searchParams.get('returnTo');
  if (returnTo) {
    try {
      const target = new URL(returnTo, current);
      if (
        target.origin === current.origin &&
        target.pathname !== '/account' &&
        isGamePath(target.pathname)
      ) {
        target.searchParams.delete('returnTo');
        return `${target.pathname}${target.search}${target.hash}`;
      }
    } catch {
      // Invalid return links must not prevent sign-in.
    }
  }
  return '/';
}
