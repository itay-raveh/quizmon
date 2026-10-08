import { PlayerRouteScreen } from '../features/friends/PlayerRouteScreen';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { isDailyDate } from '../lib/validation';
import { getUtcDate } from '../domain/quiz/daily';

export const Route = createFileRoute('/players/$id')({
  component: PlayerRouteScreen,
  staticData: { title: 'Trainer profile' },
  validateSearch: z.object({
    from: z.enum(['friends', 'rankings']).optional().catch(undefined),
    friendId: z.string().optional(),
    date: z
      .string()
      .refine((date) => isDailyDate(date) && date <= getUtcDate())
      .optional()
      .catch(undefined),
    scope: z.enum(['friends', 'global']).optional().catch(undefined),
    mode: z.enum(['daily', 'training']).optional().catch(undefined),
    page: z.int().min(1).max(100_000_000).optional().catch(undefined),
  }),
});
