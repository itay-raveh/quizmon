import type { ActiveGameSnapshot } from './active-game.ts';
import { createLeagueVictoryRecord } from './hall-of-fame.ts';
import { isLeagueVictory } from '../quiz/league.ts';
import { snapshotRoundRules } from '../quiz/round-rules.ts';
import { calculateScore, getResponseTime } from '../quiz/scoring.ts';
import { trainingConfig } from '../sync/progress.ts';
import type { RoundCompletion } from '../sync/progress.ts';

export function completeRound(
  round: Pick<
    ActiveGameSnapshot,
    | 'answers'
    | 'questions'
    | 'settings'
    | 'mode'
    | 'scoreMultipliers'
    | 'roundId'
  >,
  completedAt: string,
  trainerName: string,
) {
  const { answers, questions, settings, mode, scoreMultipliers } = round;
  const rules = snapshotRoundRules(settings);
  const result = {
    ...(rules ? { rules } : {}),
    answers,
    ...(scoreMultipliers ? { scoreMultipliers } : {}),
    correctCount: answers.filter(({ correct }) => correct).length,
    ...getResponseTime(answers),
    questionCount: questions.length,
    score: calculateScore(answers, scoreMultipliers),
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
