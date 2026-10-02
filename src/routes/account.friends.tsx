import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/account/friends')({
  validateSearch: z.object({ id: z.string().optional() }),
});
