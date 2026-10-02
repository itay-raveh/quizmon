import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer/edit')({
  component: () => <RouteScreen route="trainer" />,
});
