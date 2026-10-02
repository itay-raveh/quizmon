import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/league')({
  component: () => <RouteScreen route="league" />,
});
