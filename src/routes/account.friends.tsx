import { FriendsRouteScreen } from '../features/account/AccountRouteScreen';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/account/friends')({
  component: FriendsRouteScreen,
  validateSearch: z.object({ id: z.string().optional() }),
});
