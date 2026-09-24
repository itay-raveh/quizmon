import { reportSaveIssue } from './save-health';
import { trackGameCompleted } from '../analytics';
import { parseActiveGameSave } from '../../domain/player/active-game';
import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import { completeRound } from '../../domain/player/game-history';
import { applyResult } from '../../domain/player/game-progress';
import { getDailyResultKey } from '../../domain/quiz/daily-track';
import { isRecord, isUuid } from '../validation';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import type { RoundCompletion } from '../../domain/sync/progress';
import {
  archiveCompletion,
  scoreRound,
  validateRoundFact,
  type RoundFact,
} from '../../domain/sync/round-facts';
import type { ActiveGameSnapshot } from './active-game-storage';
import type { LocalRow } from './local-database';
import { rebuildGuestProgress } from './game-history';
import {
  appendLocalAction,
  getPlayerDatabase,
  readLocalDailyAttempts,
  readPlayerData,
  readState,
  transactPlayer,
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
    const stored: unknown = row ? JSON.parse(row.payload) : null;
    active = row ? parseActiveGameSave(stored) : null;
    if (active && isRecord(stored) && stored.roundId !== active.roundId) {
      const legacyId =
        typeof stored.roundId === 'string' ? stored.roundId : stored.seed;
      if (typeof legacyId === 'string' && active.completedAt) {
        const database = getPlayerDatabase();
        const [completed] = await database.getAll<LocalRow>(
          'SELECT id,payload FROM local_completions WHERE id = ?',
          [legacyId],
        );
        const account = (await readState(database)).account;
        const [synced] = account
          ? await database.getAll<{ id: string }>(
              'SELECT id FROM round WHERE id = ? AND player_id = ?',
              [legacyId, account.id],
            )
          : [];
        if (completed || synced) {
          await database.execute('DELETE FROM local_rounds WHERE id = ?', [
            tabId,
          ]);
          active = null;
          return;
        }
      }
      if (active.mode.kind === 'daily' && active.mode.track) {
        const linked =
          readLocalDailyAttempts()[
            getDailyResultKey(active.mode.date, active.mode.track)
          ];
        if (
          isRecord(linked) &&
          linked.seed === active.seed &&
          isUuid(linked.roundId)
        )
          active.roundId = linked.roundId;
      }
      await getPlayerDatabase().execute(
        'UPDATE local_rounds SET payload = ? WHERE id = ?',
        [JSON.stringify({ ...stored, roundId: active.roundId }), tabId],
      );
    }
  } catch (error) {
    active = null;
    reportSaveIssue(error);
    return;
  }
  await finalizeLocalRound();
};

const finalizeLocalRound = async () => {
  if (!active?.completedAt) return;
  const { completion, victory } = await completeRound(
    active,
    active.completedAt,
    readPlayerData().profile?.name ?? '',
  );
  await commitRoundCompletion(completion, victory, true, active.startedOn);
};

export const readLocalRound = () => structuredClone(active);

export const persistLocalRound = async (round: ActiveGameSnapshot) => {
  await transactPlayer(async (state, tx) => {
    if (round.playerRestoreId !== state.save.restoreId)
      throw new Error('This round belongs to a replaced save. Reload Quizmon.');
    const [completed] = await tx.getAll<LocalRow>(
      'SELECT id,payload FROM local_completions WHERE id = ?',
      [round.roundId],
    );
    const [closed] = await tx.getAll<LocalRow>(
      'SELECT id,payload FROM local_closed_rounds WHERE id = ?',
      [round.roundId],
    );
    if (completed || closed) return;
    const [stored] = await tx.getAll<LocalRow>(
      'SELECT id,payload FROM local_rounds WHERE id = ?',
      [tabId],
    );
    const previous = stored
      ? parseActiveGameSave(JSON.parse(stored.payload))
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
    if (round.mode.kind === 'daily' && round.mode.track) {
      state.dailyAttempts ??= {};
      state.dailyAttempts[
        getDailyResultKey(round.mode.date, round.mode.track)
      ] = round;
    }
    await tx.execute(
      'INSERT OR REPLACE INTO local_rounds(id,payload) VALUES (?,?)',
      [tabId, JSON.stringify(round)],
    );
  });
  const [row] = await getPlayerDatabase().getAll<LocalRow>(
    'SELECT id,payload FROM local_rounds WHERE id = ?',
    [tabId],
  );
  active = row ? parseActiveGameSave(JSON.parse(row.payload)) : null;
};

export const removeLocalRound = async () => {
  await transactPlayer(async (_state, tx) => {
    const [row] = await tx.getAll<LocalRow>(
      'SELECT id,payload FROM local_rounds WHERE id = ?',
      [tabId],
    );
    const round = row ? parseActiveGameSave(JSON.parse(row.payload)) : null;
    if (round)
      await tx.execute(
        'INSERT OR REPLACE INTO local_closed_rounds(id,payload) VALUES (?,?)',
        [round.roundId, JSON.stringify({ reason: 'left' })],
      );
    await tx.execute('DELETE FROM local_rounds WHERE id = ?', [tabId]);
  });
  active = null;
};

export const commitRoundCompletion = async (
  completion: Omit<RoundCompletion, 'datasetId'>,
  victory?: LeagueVictoryRecord,
  keepRound = false,
  startedOn?: string,
) => {
  const outcome = await transactPlayer(async (state, tx) => {
    const old = { ...completion, datasetId: state.datasetId };
    const round = archiveCompletion(
      old,
      true,
      completion.mode === 'daily'
        ? (startedOn ?? completion.dailyDate!)
        : completion.completedAt.slice(0, 10),
    );
    if (!validateRoundFact(round))
      throw new Error(
        'This round could not be saved. Your unfinished round is still on this device.',
      );
    const [existing] = await tx.getAll<LocalRow>(
      'SELECT id,payload FROM local_completions WHERE id = ?',
      [round.id],
    );
    const result = scoreRound(round);
    const evaluate = (data: typeof state.save.data) =>
      applyResult(
        data,
        round.mode === 'daily'
          ? {
              kind: 'daily',
              date: round.day!,
              ...(result.dailyTrack ? { track: result.dailyTrack } : {}),
            }
          : { kind: round.mode },
        result,
        {
          ...defaultGameSettings,
          trainingMode: completion.training.trainingMode,
          difficulty: completion.training.difficulty,
          questionSelection: completion.training.questionSelection,
          generations: completion.training.generations,
          formGroups:
            completion.training.formGroups ?? defaultGameSettings.formGroups,
          questionTypes: completion.training.questionTypes,
          automaticQuestionTypes: completion.training.automaticQuestionTypes,
        },
        victory,
        round.completed_at.slice(0, 10),
      );
    if (existing) {
      const saved = JSON.parse(existing.payload) as RoundFact;
      if (
        JSON.stringify({ ...saved, credited: true }) !== JSON.stringify(round)
      )
        throw new Error('This round ID already has a different saved result.');
      const data = structuredClone(state.save.data);
      if (saved.credited && round.mode === 'daily')
        delete data.results.daily[
          getDailyResultKey(round.day!, result.dailyTrack)
        ];
      const outcome = evaluate(data);
      if (!keepRound)
        await tx.execute('DELETE FROM local_rounds WHERE id = ?', [tabId]);
      return { ...outcome, recorded: false };
    }
    const eligible =
      round.mode !== 'daily' ||
      !(
        await tx.getAll<LocalRow>(
          "SELECT id,payload FROM local_completions WHERE json_extract(payload,'$.mode') = 'daily' AND json_extract(payload,'$.day') = ? AND json_extract(payload,'$.credited') = 1 LIMIT 1",
          [round.day],
        )
      ).length;
    round.credited = eligible;
    const outcome = evaluate(structuredClone(state.save.data));
    await tx.execute('INSERT INTO local_completions(id,payload) VALUES (?,?)', [
      round.id,
      JSON.stringify(round),
    ]);
    const { credited: _credited, ...upload } = round;
    void _credited;
    await appendLocalAction(state, tx, 'round', upload, round.id);
    if (round.mode === 'daily' && completion.result.dailyTrack)
      delete state.dailyAttempts?.[
        getDailyResultKey(round.day!, completion.result.dailyTrack)
      ];
    if (!state.account) await rebuildGuestProgress(state, tx);
    if (!keepRound)
      await tx.execute('DELETE FROM local_rounds WHERE id = ?', [tabId]);
    return { ...outcome, recorded: true };
  });
  if (outcome.recorded) trackGameCompleted(completion.mode, completion.result);
  if (!keepRound) active = null;
  return outcome;
};
