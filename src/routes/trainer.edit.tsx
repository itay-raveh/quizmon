import { TrainerRouteScreen } from '../features/trainer/TrainerRouteScreen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer/edit')({
  component: () => <TrainerRouteScreen view="front" editing />,
});
