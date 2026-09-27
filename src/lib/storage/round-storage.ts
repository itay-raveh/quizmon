import { trackGameCompleted } from '../analytics';
import { parseActiveGameSave } from '../../domain/player/active-game';
import { completeRound } from '../../domain/player/game-history';
import { applyResult } from '../../domain/player/game-progress';
import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import { getDailyResultKey } from '../../domain/quiz/daily-track';
import type { RoundCompletion } from '../../domain/sync/progress';
import { archiveCompletion, scoreRound } from '../../domain/sync/round-facts';
import type { ActiveGameSnapshot } from './active-game-storage';
import {
  currentOwnerId,
  getPlayerDatabase,
  readPlayerData,
  readPlayerSave,
  refreshPlayerData,
} from './player-storage';
import { updateDeviceState, writeCompletedRound } from './rxdb-game';

let tabId: string;
let active: ActiveGameSnapshot | null = null;

const roundKey = () => `round:${tabId}`;

export const initializeLocalRound = async () => {
  tabId = sessionStorage.getItem('quizmon.baseline.tab') ?? crypto.randomUUID();
  sessionStorage.setItem('quizmon.baseline.tab', tabId);
  const document = await getPlayerDatabase().device.findOne(roundKey()).exec();
  active = document
    ? parseActiveGameSave(document.toMutableJSON().payload)
    : null;
  if (!active) return;
  const closed = await getPlayerDatabase()
    .device.findOne(`closed:${active.roundId}`)
    .exec();
  if (closed) {
    await document?.remove();
    active = null;
    return;
  }
  if (!active.completedAt) return;
  const { completion, victory } = await completeRound(
    active,
    active.completedAt,
    readPlayerData().profile?.name ?? '',
  );
  await commitRoundCompletion(completion, victory, true, active.startedOn);
};

export const readLocalRound = () => structuredClone(active);

export const persistLocalRound = async (round: ActiveGameSnapshot) => {
  if (round.playerRestoreId !== readPlayerSave().restoreId)
    throw new Error('This round belongs to a replaced save. Reload Quizmon.');
  const db = getPlayerDatabase();
  const [completed, closed, stored] = await Promise.all([
    db.rounds.findOne(round.roundId).exec(),
    db.device.findOne(`closed:${round.roundId}`).exec(),
    db.device.findOne(roundKey()).exec(),
  ]);
  if (completed || closed) return;
  const previous = stored ? parseActiveGameSave(stored.toJSON().payload) : null;
  if (
    previous?.roundId === round.roundId &&
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
  if (stored)
    await stored.incrementalModify((data) => ({ ...data, payload: round }));
  else await db.device.insert({ id: roundKey(), payload: round });
  const mode = round.mode;
  if (mode.kind === 'daily' && mode.track)
    await updateDeviceState(db, (state) => {
      state.dailyAttempts[getDailyResultKey(mode.date, mode.track)] = round;
    });
  active = structuredClone(round);
  await refreshPlayerData();
};

export const removeLocalRound = async () => {
  const db = getPlayerDatabase();
  const stored = await db.device.findOne(roundKey()).exec();
  if (stored) {
    const round = parseActiveGameSave(stored.toJSON().payload);
    await db.device.incrementalUpsert({
      id: `closed:${round.roundId}`,
      payload: { reason: 'left' },
    });
    await stored.remove();
  }
  active = null;
};

export const commitRoundCompletion = async (
  completion: RoundCompletion,
  victory?: LeagueVictoryRecord,
  keepRound = false,
  startedOn?: string,
) => {
  const db = getPlayerDatabase();
  const ownerId = currentOwnerId();
  const round = archiveCompletion(
    completion,
    true,
    completion.mode === 'daily'
      ? (startedOn ?? completion.dailyDate!)
      : completion.completedAt.slice(0, 10),
  );
  const existing = await db.rounds.findOne(round.id).exec();
  if (!existing && round.mode === 'daily') {
    const all = await db.rounds.find().exec();
    round.credited = !all.some(
      ({ fact }) =>
        fact.mode === 'daily' && fact.day === round.day && fact.credited,
    );
  }
  const fact = existing?.toMutableJSON().fact ?? round;
  const result = scoreRound(fact);
  const data = readPlayerData();
  const outcome = applyResult(
    data,
    fact.mode === 'daily'
      ? {
          kind: 'daily',
          date: fact.day!,
          ...(result.dailyTrack ? { track: result.dailyTrack } : {}),
        }
      : { kind: fact.mode },
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
    fact.completed_at.slice(0, 10),
  );
  const saved = await writeCompletedRound(db, ownerId, fact);
  if (round.mode === 'daily' && completion.result.dailyTrack)
    await updateDeviceState(db, (state) => {
      delete state.dailyAttempts[
        getDailyResultKey(round.day!, completion.result.dailyTrack)
      ];
    });
  if (!keepRound) {
    const stored = await db.device.findOne(roundKey()).exec();
    await stored?.remove();
    active = null;
  }
  await refreshPlayerData();
  if (saved) trackGameCompleted(completion.mode, completion.result);
  return outcome;
};
