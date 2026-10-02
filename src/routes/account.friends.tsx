import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/account/friends')({
  component: () => <RouteScreen route="friends" />,
  validateSearch: z.object({ id: z.string().optional() }),
});
