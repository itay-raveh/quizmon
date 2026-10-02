import { RouteScreen } from '../app/AppView';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => <RouteScreen route="home" />,
});
