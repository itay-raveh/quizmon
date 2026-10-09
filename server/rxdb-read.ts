import type { TrainerProfile } from '../src/domain/player/trainer-profile.ts';
import { projectCompactRoundHistory } from '../src/domain/player/compact-history.ts';
import { getTrainerStats } from '../src/domain/player/progress.ts';
import type { CompactRound } from '../src/domain/sync/compact-rounds.ts';

export function projectTrainerHistory(
  profile: TrainerProfile,
  rounds: CompactRound[],
) {
  const projection = projectCompactRoundHistory(rounds, profile.name);
  return {
    stats: getTrainerStats(projection.results, projection.pokedex),
    pokedex: projection.pokedex,
    creditedDates: projection.results.streak.creditedDates,
  };
}
