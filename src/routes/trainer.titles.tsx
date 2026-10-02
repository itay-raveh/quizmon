import { TrainerRouteScreen } from '../features/trainer/TrainerRouteScreen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer/titles')({
  component: () => <TrainerRouteScreen view="titles" />,
});
