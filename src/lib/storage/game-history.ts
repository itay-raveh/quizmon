import { projectRoundHistory } from '../../domain/player/game-history';
import {
  validateRoundFact,
  type RoundFact,
} from '../../domain/sync/round-facts';
import { isRecord } from '../validation';
import type { LocalRow, LocalTransaction } from './local-database';
import type { LocalPlayerState } from './player-storage';

export async function applyRoundReceipt(
  tx: LocalTransaction,
  id: string,
  credited: boolean,
) {
  await tx.execute(
    "UPDATE local_completions SET payload = json_set(payload,'$.credited',json(?)) WHERE id = ?",
    [credited ? 'true' : 'false', id],
  );
}

export async function readLocalRounds(
  tx: LocalTransaction,
): Promise<RoundFact[]> {
  const rows = await tx.getAll<LocalRow>(
    'SELECT id,payload FROM local_completions',
  );
  const rounds: RoundFact[] = [];
  for (const row of rows) {
    const round: unknown = JSON.parse(row.payload);
    const needsRepair =
      isRecord(round) && (round.credited === 0 || round.credited === 1);
    if (needsRepair) round.credited = round.credited === 1;
    if (!validateRoundFact(round) || round.id !== row.id)
      throw new Error('A saved completed round is damaged.');
    if (needsRepair)
      await tx.execute(
        'UPDATE local_completions SET payload = ? WHERE id = ?',
        [JSON.stringify(round), row.id],
      );
    rounds.push(round);
  }
  return rounds;
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
