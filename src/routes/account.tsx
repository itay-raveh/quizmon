import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/account')({
  validateSearch: z.object({ returnTo: z.string().optional() }),
});
