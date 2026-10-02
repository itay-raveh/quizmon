import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../routeTree.gen';

export const router = createRouter({ routeTree, scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
  interface HistoryState {
    from?: 'friends' | 'rankings';
    view?: 'hall' | 'challenge';
  }
}
