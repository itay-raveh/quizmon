import { projectRoundHistory } from '../../domain/player/game-history';
import {
  validateRoundFact,
  type RoundFact,
} from '../../domain/sync/round-facts';
import type { LocalRow, LocalTransaction } from './local-database';
import type { LocalPlayerState } from './player-storage';

export async function readLocalRounds(
  tx: LocalTransaction,
): Promise<RoundFact[]> {
  const rows = await tx.getAll<LocalRow>(
    'SELECT id,payload FROM local_completions',
  );
  return rows.map((row) => {
    const round: unknown = JSON.parse(row.payload);
    if (!validateRoundFact(round) || round.id !== row.id)
      throw new Error('A saved completed round is damaged.');
    return round;
  });
}

export async function rebuildGuestProgress(
  state: LocalPlayerState,
  tx: LocalTransaction,
) {
  const rounds = await readLocalRounds(tx);
  rounds.sort(
    (a, b) =>
      a.completed_at.localeCompare(b.completed_at) || a.id.localeCompare(b.id),
  );
  Object.assign(state.save.data, projectRoundHistory(rounds));
}
