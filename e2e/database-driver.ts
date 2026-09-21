import { SAVE_SCHEMA_VERSION } from '../src/domain/player/player-save';
import { column, PowerSyncDatabase, Schema, Table } from '@powersync/web';
import {
  emptyPlayerData,
  type PlayerSave,
} from '../src/domain/player/player-save';
import { createTrainerProfile } from '../src/domain/player/trainer-profile';
import type { ActiveGameSnapshot } from '../src/lib/storage/active-game-storage';
import { localTables } from '../src/lib/storage/local-database';
import type { LocalPlayerState } from '../src/lib/storage/player-storage';

let db: PowerSyncDatabase;
type Row = { payload: string };
export async function open(worker: string, seed = false) {
  db ??= new PowerSyncDatabase({
    schema: new Schema(
      Object.fromEntries(
        localTables.map((name) => [
          name,
          new Table({ payload: column.text }, { localOnly: true }),
        ]),
      ),
    ),
    database: { dbFilename: 'quizmon-guest-baseline.sqlite', worker },
    sync: { worker },
  });
  await db.init();
  if (!seed) return;
  await db.writeTransaction(async (transaction) => {
    const existing = await transaction.getAll<Row>(
      "SELECT payload FROM local_state WHERE id = 'player'",
    );
    if (existing.length) return;
    const raw = localStorage.getItem('quizmon.baseline.fixture-save');
    const save =
      raw === null
        ? {
            version: SAVE_SCHEMA_VERSION,
            restoreId: null,
            data: { ...emptyPlayerData(), profile: createTrainerProfile() },
          }
        : null;
    const payload = `{"version":1,"projectionVersion":1,"datasetId":"${crypto.randomUUID()}","predecessors":{},"save":${raw ?? JSON.stringify(save)}}`;
    await transaction.execute(
      "INSERT INTO local_state(id,payload) VALUES ('player',?)",
      [payload],
    );
    const oldRound = sessionStorage.getItem('quizmon.baseline.fixture-round');
    if (oldRound) {
      const round = JSON.parse(oldRound) as ActiveGameSnapshot;
      round.roundId ??= crypto.randomUUID();
      const tabId =
        sessionStorage.getItem('quizmon.baseline.tab') ?? crypto.randomUUID();
      sessionStorage.setItem('quizmon.baseline.tab', tabId);
      await transaction.execute(
        'INSERT INTO local_rounds(id,payload) VALUES (?,?)',
        [tabId, JSON.stringify(round)],
      );
    }
  });
}
export async function readSave(): Promise<PlayerSave> {
  const [row] = await db.getAll<Row>(
    "SELECT payload FROM local_state WHERE id = 'player'",
  );
  return (JSON.parse(row!.payload) as LocalPlayerState).save;
}
export async function writeSave(save: PlayerSave) {
  await db.writeTransaction(async (transaction) => {
    const [row] = await transaction.getAll<Row>(
      "SELECT payload FROM local_state WHERE id = 'player'",
    );
    const state = JSON.parse(row!.payload) as LocalPlayerState;
    state.save = save;
    await transaction.execute(
      "UPDATE local_state SET payload = ? WHERE id = 'player'",
      [JSON.stringify(state)],
    );
  });
}
export async function readRound(): Promise<ActiveGameSnapshot | null> {
  const [row] = await db.getAll<Row>(
    'SELECT payload FROM local_rounds WHERE id = ?',
    [sessionStorage.getItem('quizmon.baseline.tab')],
  );
  return row ? (JSON.parse(row.payload) as ActiveGameSnapshot) : null;
}

export async function readRawPlayer(): Promise<string> {
  const [row] = await db.getAll<Row>(
    "SELECT payload FROM local_state WHERE id = 'player'",
  );
  return row!.payload;
}
