import type { ActiveGameSnapshot } from './active-game.ts';
import { createLeagueVictoryRecord } from './hall-of-fame.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import { snapshotRoundRules } from '../quiz/round-rules.ts';
import {
  calculateScore,
  getResponseTime,
  getTrainingScoreBreakdown,
} from '../quiz/scoring.ts';
import { trainingConfig } from '../sync/progress.ts';
import type { RoundCompletion } from '../sync/progress.ts';

export function completeRound(
  round: Pick<
    ActiveGameSnapshot,
    'answers' | 'questions' | 'settings' | 'mode' | 'roundId'
  >,
  completedAt: string,
  trainerName: string,
) {
  const { answers, questions, settings, mode } = round;
  if (mode.kind === 'training' && !settings.level)
    throw new Error('Training level is required to score a round.');
  const rules = snapshotRoundRules(settings);
  const result = {
    ...(rules ? { rules } : {}),
    answers,
    correctCount: answers.filter(({ correct }) => correct).length,
    ...getResponseTime(answers),
    questionCount: questions.length,
    score:
      mode.kind === 'training'
        ? getTrainingScoreBreakdown(answers, settings.level!).score
        : calculateScore(answers),
  };
  const completionId = round.roundId;
  const victory =
    mode.kind === 'league' && isLeagueVictory(result)
      ? createLeagueVictoryRecord(
          result,
          questions,
          completionId,
          completedAt,
          trainerName,
        )
      : undefined;
  const completion: RoundCompletion = {
    completionId,
    completedAt,
    mode: mode.kind,
    dailyDate: mode.kind === 'daily' ? mode.date : null,
    training: trainingConfig(settings),
    result,
  };
  return { completion, victory };
}
