import { lazy, Suspense } from 'react';

const AppRoot = lazy(() =>
  import('./AppRoot').then(({ AppRoot }) => ({ default: AppRoot })),
);

export const AppRouteShell = () => (
  <Suspense fallback={null}>
    <AppRoot />
  </Suspense>
);
