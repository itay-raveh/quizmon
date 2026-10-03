import { trackGameCompleted } from '../analytics';
import { parseRound } from '../../domain/player/schemas/round';
import { completeRound } from '../../domain/player/game-history';
import { applyResult } from '../../domain/player/game-progress';
import type { LeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import type { RoundCompletion } from '../../domain/sync/progress';
import type { QuestionType } from '../../domain/quiz/types';
import {
  compactCompletion,
  compactRoundSchema,
  scoreCompactRound,
} from '../../domain/sync/compact-rounds';
import {
  currentOwnerId,
  getPlayerDatabase,
  readPlayerData,
  readPlayerRestoreId,
  refreshPlayerData,
} from './player-storage';
import { updateDeviceState, writeCompletedRound } from './rxdb-game';

export const readPreviousTrainingQuestionTypes = async (): Promise<
  ReadonlySet<QuestionType>
> => {
  const db = getPlayerDatabase();
  const rounds = await db.rounds
    .find({ selector: { ownerId: currentOwnerId(), mode: 'training' } })
    .exec();
  const previous = rounds
    .map((document) => document.toMutableJSON())
    .sort(
      (a, b) =>
        a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
    )
    .at(-1);
  if (!previous) return new Set();
  const round = compactRoundSchema.parse(previous);
  return new Set(
    round.answers
      .map((answer) => answer.type)
      .filter((type): type is QuestionType => type !== 'champion'),
  );
};

export const claimDailyAttempt = async (date: string) => {
  const db = getPlayerDatabase();
  const claimed = await updateDeviceState(db, (state) => {
    if (state.dailyAttempts[date]) return false;
    state.dailyAttempts[date] = true;
    return true;
  });
  await refreshPlayerData();
  return claimed;
};

export const discardSavedRounds = async () => {
  const db = getPlayerDatabase();
  const documents = await db.device.find().exec();
  const closed = new Set(
    documents.filter(({ id }) => id.startsWith('closed:')).map(({ id }) => id),
  );
  for (const document of documents) {
    if (document.id.startsWith('round:')) {
      const round = parseRound(document.toMutableJSON().payload);
      if (
        round?.mode.kind === 'daily' &&
        round.playerRestoreId === readPlayerRestoreId() &&
        !round.completedAt
      ) {
        const date = round.mode.date;
        await updateDeviceState(db, (state) => {
          state.dailyAttempts[date] = true;
        });
      }
      if (
        round?.completedAt &&
        round.playerRestoreId === readPlayerRestoreId() &&
        !closed.has(`closed:${round.roundId}`)
      ) {
        const { completion, victory } = completeRound(
          round,
          round.completedAt,
          readPlayerData().profile?.name ?? '',
        );
        await commitRoundCompletion(completion, victory);
      }
      await document.remove();
    } else if (document.id.startsWith('closed:')) {
      await document.remove();
    }
  }
  await refreshPlayerData();
};

export const commitRoundCompletion = async (
  completion: RoundCompletion,
  victory?: LeagueVictoryRecord,
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
  await refreshPlayerData();
  if (saved) trackGameCompleted(completion.mode, completion.result);
  return outcome;
};
