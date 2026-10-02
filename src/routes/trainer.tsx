import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer')({
  component: () => <RouteScreen route="trainer" />,
});
