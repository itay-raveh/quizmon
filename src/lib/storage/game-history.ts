import {
  projectGameHistory,
  progressProjectionVersion,
  readRecordedGame,
  type RecordedGame,
} from '../../domain/player/game-history';
import type { LocalRow, LocalTransaction } from './local-database';
import type { LocalPlayerState } from './player-storage';

async function readLocalGames(tx: LocalTransaction): Promise<RecordedGame[]> {
  const rows = await tx.getAll<LocalRow>(
    'SELECT id,payload FROM local_completions',
  );
  return rows.map((row) => {
    const receipt = JSON.parse(row.payload) as {
      completion: unknown;
      eligible: boolean;
    };
    const completion = readRecordedGame(receipt.completion);
    if (
      completion.completionId !== row.id ||
      typeof receipt.eligible !== 'boolean'
    )
      throw new Error('This game record is damaged.');
    return { completion, eligible: receipt.eligible };
  });
}

export async function rebuildGuestProgress(
  state: LocalPlayerState,
  tx: LocalTransaction,
) {
  const games = await readLocalGames(tx);
  games.sort(
    (a, b) =>
      a.completion.completedAt.localeCompare(b.completion.completedAt) ||
      a.completion.completionId.localeCompare(b.completion.completionId),
  );
  const progress = projectGameHistory(games);
  const discoveries = await tx.getAll<LocalRow>(
    "SELECT id,payload FROM local_actions WHERE json_extract(payload,'$.kind') = 'discoveries.add'",
  );
  for (const row of discoveries) {
    const action = JSON.parse(row.payload) as {
      payload: { pokemon: string[] };
    };
    progress.pokedex.push(...action.payload.pokemon);
  }
  progress.pokedex = [...new Set(progress.pokedex)];
  Object.assign(state.save.data, progress);
  state.projectionVersion = progressProjectionVersion;
}
