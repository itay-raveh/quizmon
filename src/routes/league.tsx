import { LeagueRouteScreen } from '../features/league/LeagueRouteScreen';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/league')({
  component: LeagueRouteScreen,
  validateSearch: z.object({
    view: z.enum(['hall', 'challenge', 'results']).optional().catch(undefined),
  }),
});
