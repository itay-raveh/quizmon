import { createFileRoute, notFound } from '@tanstack/react-router';
import { z } from 'zod';
import { isDailyDate } from '../lib/validation';

export const Route = createFileRoute('/daily/$date')({
  beforeLoad: ({ params }) => {
    // TanStack Router uses a special thrown value for unmatched routes.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    if (!isDailyDate(params.date)) throw notFound();
  },
  validateSearch: z.object({
    play: z.literal('1').optional().catch(undefined),
  }),
});
