import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { captureUnexpectedError } from '../lib/sentry';
import { queryClient } from '../lib/query-client';
import { router } from './router';

export const mountGame = (root: HTMLElement) => {
  const app = createRoot(root);
  const game = Promise.all([
    import('./LocalGame'),
    import('../lib/storage/save-recovery'),
  ]);
  return async () => {
    try {
      const [, { inspectSavedData }] = await game;
      inspectSavedData();
      app.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </StrictMode>,
      );
    } catch (error) {
      captureUnexpectedError('app.mount', error);
      app.render(
        <p role="alert">
          Quizmon could not be loaded. Please reload to try again.
        </p>,
      );
    }
  };
};
