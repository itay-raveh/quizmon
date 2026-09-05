import type { TrainerView } from '@/game/trainer';

export const parseTrainerRoute = (search: string): TrainerView | null => {
  const value = new URLSearchParams(search).get('trainer');
  if (value === 'card' || value === 'front') return 'front';
  if (value === 'badges') return 'badges';
  if (value === 'titles') return 'titles';
  return null;
};

export const setTrainerRoute = (url: URL, view: TrainerView) => {
  url.searchParams.set('trainer', view === 'front' ? 'card' : view);
  return url;
};
