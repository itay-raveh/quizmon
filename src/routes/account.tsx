import { AccountRouteScreen } from '../features/account/AccountRouteScreen';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/account')({
  component: AccountRouteScreen,
  validateSearch: z.object({ returnTo: z.string().optional() }),
});
