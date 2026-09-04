import type { TrainerCardFace } from '@/game/trainer';

export const parseTrainerRoute = (search: string): TrainerCardFace | null => {
  const value = new URLSearchParams(search).get('trainer');
  if (value === 'front') return 'front';
  if (value === 'back') return 'records';
  return null;
};

export const setTrainerRoute = (url: URL, face: TrainerCardFace) => {
  url.searchParams.set('trainer', face === 'front' ? 'front' : 'back');
  return url;
};
