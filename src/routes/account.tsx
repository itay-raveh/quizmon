import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/account')({
  component: () => <RouteScreen route="account" />,
  validateSearch: z.object({ returnTo: z.string().optional() }),
});
