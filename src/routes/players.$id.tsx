import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/players/$id')({
  component: () => <RouteScreen route="player" />,
});
