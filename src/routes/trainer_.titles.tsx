import { TrainerRouteScreen } from '../features/trainer/TrainerRouteScreen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer_/titles')({
  component: () => <TrainerRouteScreen view="titles" />,
  staticData: { title: 'Trainer Titles' },
});
