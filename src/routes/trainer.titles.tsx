import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer/titles')({
  component: () => <RouteScreen route="trainer" />,
});
