import { createRootRoute } from '@tanstack/react-router';
import { AppRouteShell } from '../app/AppRouteShell';

export const Route = createRootRoute({
  component: AppRouteShell,
  notFoundComponent: () => (
    <section>
      <h1>Page not found</h1>
      <p>This Quizmon page does not exist.</p>
    </section>
  ),
});
