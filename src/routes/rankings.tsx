import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { isDailyDate } from '../lib/validation';

export const Route = createFileRoute('/rankings')({
  component: () => <RouteScreen route="rankings" />,
  validateSearch: z.object({
    date: z.string().refine(isDailyDate).optional().catch(undefined),
    scope: z.enum(['friends', 'global']).optional().catch(undefined),
    mode: z.enum(['daily', 'training']).optional().catch(undefined),
  }),
});
