import { TrainerRouteScreen } from '../features/trainer/TrainerRouteScreen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/trainer/pokedex')({
  component: () => <TrainerRouteScreen view="pokedex" />,
  staticData: { title: 'Personal Pokédex' },
});
