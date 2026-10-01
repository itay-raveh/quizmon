import { trackGameCompleted } from '../analytics';
import { parseRound } from '../../domain/player/schemas/round';
import { completeRound } from '../../domain/player/game-history';
import { applyResult } from '../../domain/player/game-progress';
import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import type { RoundCompletion } from '../../domain/sync/progress';
import {
  compactCompletion,
  compactRoundSchema,
  scoreCompactRound,
} from '../../domain/sync/compact-rounds';
import type { ActiveGameSnapshot } from './active-game-storage';
import {
  currentOwnerId,
  getPlayerDatabase,
  readPlayerData,
  readPlayerRestoreId,
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
  active = document ? parseRound(document.toMutableJSON().payload) : null;
  if (!active) {
    await document?.remove();
    return;
  }
  const closed = await getPlayerDatabase()
    .device.findOne(`closed:${active.roundId}`)
    .exec();
  if (closed) {
    await document?.remove();
    active = null;
    return;
  }
  if (!active.completedAt) return;
  const { completion, victory } = completeRound(
    active,
    active.completedAt,
    readPlayerData().profile?.name ?? '',
  );
  await commitRoundCompletion(completion, victory, true);
};

export const readLocalRound = () => structuredClone(active);

export const persistLocalRound = async (round: ActiveGameSnapshot) => {
  if (round.playerRestoreId !== readPlayerRestoreId())
    throw new Error('This round belongs to a replaced save. Reload Quizmon.');
  const db = getPlayerDatabase();
  const [completed, closed, stored] = await Promise.all([
    db.rounds.findOne(round.roundId).exec(),
    db.device.findOne(`closed:${round.roundId}`).exec(),
    db.device.findOne(roundKey()).exec(),
  ]);
  if (completed || closed) return;
  const previous = stored ? parseRound(stored.toJSON().payload) : null;
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
  if (mode.kind === 'daily')
    await updateDeviceState(db, (state) => {
      state.dailyAttempts[mode.date] = round;
    });
  active = structuredClone(round);
};

export const removeLocalRound = async () => {
  const db = getPlayerDatabase();
  const stored = await db.device.findOne(roundKey()).exec();
  if (stored) {
    const round = parseRound(stored.toJSON().payload);
    if (round)
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
) => {
  const db = getPlayerDatabase();
  const ownerId = currentOwnerId();
  const round = compactCompletion(completion);
  const existing = await db.rounds.findOne(round.id).exec();
  const fact = existing
    ? compactRoundSchema.parse(existing.toMutableJSON())
    : round;
  const result = scoreCompactRound(fact);
  const data = readPlayerData();
  const outcome = applyResult(
    data,
    fact.mode === 'daily'
      ? {
          kind: 'daily',
          date: fact.day,
        }
      : { kind: fact.mode },
    result,
    victory,
  );
  const saved = await writeCompletedRound(db, ownerId, fact);
  if (round.mode === 'daily') {
    await updateDeviceState(db, (state) => {
      delete state.dailyAttempts[round.day];
    });
  }
  if (!keepRound) {
    const stored = await db.device.findOne(roundKey()).exec();
    await stored?.remove();
    active = null;
  }
  await refreshPlayerData();
  if (saved) trackGameCompleted(completion.mode, completion.result);
  return outcome;
};
