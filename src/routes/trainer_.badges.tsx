import { TrainerRouteScreen } from '../features/trainer/TrainerRouteScreen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer_/badges')({
  component: () => <TrainerRouteScreen view="badges" />,
  staticData: { title: 'League Badge Case' },
});
