import type { TrainerView } from '@/domain/player/trainer-progression';

export const trainerPath = (view: TrainerView) =>
  view === 'front' ? '/trainer' : `/trainer/${view}`;
