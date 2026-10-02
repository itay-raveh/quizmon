import { PlayRouteScreen } from '../app/GameScreen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: PlayRouteScreen,
  staticData: { title: '' },
});
