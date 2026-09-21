import { reportSaveIssue } from './save-health';
import { parseActiveGameSave } from '../../domain/player/active-game';
import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import {
  applyRecordedGame,
  completeRound,
  roundDiscoveries,
} from '../../domain/player/game-history';
import { getDailyResultKey } from '../../domain/quiz/daily-track';
import type { RoundCompletion } from '../../domain/sync/progress';
import type { ActiveGameSnapshot } from './active-game-storage';
import type { LocalRow, LocalTransaction } from './local-database';
import {
  appendLocalAction,
  getPlayerDatabase,
  readPlayerData,
  transactPlayer,
  type LocalPlayerState,
} from './player-storage';

let tabId: string;
let active: ActiveGameSnapshot | null = null;
export const initializeLocalRound = async () => {
  tabId = sessionStorage.getItem('quizmon.baseline.tab') ?? crypto.randomUUID();
  sessionStorage.setItem('quizmon.baseline.tab', tabId);
  const [row] = await getPlayerDatabase().getAll<LocalRow>(
    'SELECT id,payload FROM local_rounds WHERE id = ?',
    [tabId],
  );
  try {
    active = row ? parseActiveGameSave(JSON.parse(row.payload)) : null;
  } catch (error) {
    active = null;
    reportSaveIssue(error);
    return;
  }
  await finalizeLocalRound();
};
const finalizeLocalRound = async () => {
  if (active?.completedAt) {
    const { completion, victory } = await completeRound(
      active,
      active.completedAt,
      readPlayerData().profile?.name ?? '',
    );
    await commitRoundCompletion(completion, victory, true);
  }
};
export const readLocalRound = () => structuredClone(active);
const addDiscoveries = async (
  state: LocalPlayerState,
  transaction: LocalTransaction,
  pokemon: string[],
) => {
  const known = new Set(state.save.data.pokedex);
  const added = pokemon.filter((name) => !known.has(name));
  if (!added.length) return;
  state.save.data.pokedex = [...new Set([...known, ...added])];
  await appendLocalAction(state, transaction, 'discoveries.add', {
    pokemon: added,
  });
};
export const persistLocalRound = async (round: ActiveGameSnapshot) => {
  await transactPlayer(async (state, transaction) => {
    if (round.playerRestoreId !== state.save.restoreId)
      throw new Error('This round belongs to a replaced save. Reload Quizmon.');
    const [completed] = await transaction.getAll<LocalRow>(
      'SELECT id,payload FROM local_completions WHERE id = ?',
      [round.roundId],
    );
    const [closed] = await transaction.getAll<LocalRow>(
      'SELECT id,payload FROM local_closed_rounds WHERE id = ?',
      [round.roundId],
    );
    if (completed || closed) return;
    const [stored] = await transaction.getAll<LocalRow>(
      'SELECT id,payload FROM local_rounds WHERE id = ?',
      [tabId],
    );
    const previous = stored
      ? (JSON.parse(stored.payload) as ActiveGameSnapshot)
      : null;
    if (
      previous &&
      previous.roundId === round.roundId &&
      previous.answers.length > round.answers.length
    )
      return;
    if (
      round.answers.length === round.questionCount ||
      (round.mode.kind === 'league' &&
        round.answers.some((answer) => !answer.correct))
    )
      round.completedAt =
        previous?.completedAt ?? round.completedAt ?? new Date().toISOString();
    await addDiscoveries(state, transaction, roundDiscoveries(round));
    if (round.mode.kind === 'daily' && round.mode.track) {
      state.dailyAttempts ??= {};
      state.dailyAttempts[
        getDailyResultKey(round.mode.date, round.mode.track)
      ] = round;
    }
    await transaction.execute(
      'INSERT OR REPLACE INTO local_rounds(id,payload) VALUES (?,?)',
      [tabId, JSON.stringify(round)],
    );
  });
  const [row] = await getPlayerDatabase().getAll<LocalRow>(
    'SELECT id,payload FROM local_rounds WHERE id = ?',
    [tabId],
  );
  active = row ? parseActiveGameSave(JSON.parse(row.payload)) : null;
  await finalizeLocalRound();
};
export const removeLocalRound = async () => {
  await transactPlayer(async (_state, transaction) => {
    const [row] = await transaction.getAll<LocalRow>(
      'SELECT id,payload FROM local_rounds WHERE id = ?',
      [tabId],
    );
    const round = row ? parseActiveGameSave(JSON.parse(row.payload)) : null;
    if (round?.roundId)
      await transaction.execute(
        'INSERT OR REPLACE INTO local_closed_rounds(id,payload) VALUES (?,?)',
        [round.roundId, JSON.stringify({ reason: 'left' })],
      );
    await transaction.execute('DELETE FROM local_rounds WHERE id = ?', [tabId]);
  });
  active = null;
};
export const commitRoundCompletion = async (
  completion: Omit<RoundCompletion, 'datasetId'>,
  victory?: LeagueVictoryRecord,
  keepRound = false,
) => {
  const { hash, validateCompletion } =
    await import('../../domain/sync/progress');
  const outcome = await transactPlayer(async (state, transaction) => {
    const payload: RoundCompletion = {
      ...completion,
      datasetId: state.datasetId,
    };
    const invalid = validateCompletion(payload);
    if (invalid && invalid !== 'unsupported_version')
      throw new Error(
        `This round could not be saved (${invalid}). Your unfinished round is still on this device.`,
      );
    const [existing] = await transaction.getAll<LocalRow>(
      'SELECT id,payload FROM local_completions WHERE id = ?',
      [payload.completionId],
    );
    if (existing) {
      const receipt = JSON.parse(existing.payload) as {
        hash: string;
        outcome: ReturnType<typeof applyRecordedGame>;
      };
      if (receipt.hash !== (await hash(payload)))
        throw new Error('This round ID already has a different saved result.');
      if (!keepRound)
        await transaction.execute('DELETE FROM local_rounds WHERE id = ?', [
          tabId,
        ]);
      return receipt.outcome;
    }
    await addDiscoveries(state, transaction, payload.discoveries);
    const eligible =
      payload.mode !== 'daily' ||
      !Object.keys(state.save.data.results.daily).some(
        (key) => key.split(':')[0] === payload.dailyDate,
      );
    const outcome = applyRecordedGame(
      state.save.data,
      { completion: payload, eligible },
      victory,
    );
    if (payload.mode === 'daily' && payload.result.dailyTrack)
      delete state.dailyAttempts?.[
        getDailyResultKey(payload.dailyDate!, payload.result.dailyTrack)
      ];
    await appendLocalAction(
      state,
      transaction,
      'completion.record',
      payload,
      payload.completionId,
    );
    await transaction.execute(
      'INSERT INTO local_completions(id,payload) VALUES (?,?)',
      [
        payload.completionId,
        JSON.stringify({
          hash: await hash(payload),
          outcome,
          completion: payload,
          eligible,
        }),
      ],
    );
    if (!keepRound)
      await transaction.execute('DELETE FROM local_rounds WHERE id = ?', [
        tabId,
      ]);
    return outcome;
  });
  if (!keepRound) active = null;
  return outcome;
};
