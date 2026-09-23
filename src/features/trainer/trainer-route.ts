import type { TrainerView } from '@/domain/player/trainer-progression';

export const parseTrainerRoute = (pathname: string): TrainerView | null => {
  if (pathname === '/trainer' || pathname === '/trainer/edit') return 'front';
  if (pathname === '/trainer/badges') return 'badges';
  if (pathname === '/trainer/titles') return 'titles';
  if (pathname === '/trainer/pokedex') return 'pokedex';
  return null;
};

export const trainerPath = (view: TrainerView) =>
  view === 'front' ? '/trainer' : `/trainer/${view}`;
