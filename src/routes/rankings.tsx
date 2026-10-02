import { RankingsRouteScreen } from '../features/friends/RankingsRouteScreen';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { isDailyDate } from '../lib/validation';
import { getUtcDate } from '../domain/quiz/daily';

export const Route = createFileRoute('/rankings')({
  component: RankingsRouteScreen,
  validateSearch: z.object({
    date: z
      .string()
      .refine((date) => isDailyDate(date) && date <= getUtcDate())
      .optional()
      .catch(undefined),
    scope: z.enum(['friends', 'global']).optional().catch(undefined),
    mode: z.enum(['daily', 'training']).optional().catch(undefined),
  }),
});
