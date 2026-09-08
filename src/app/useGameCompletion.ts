import { createLeagueVictoryRecord } from '@/game/hall-of-fame';
import { isLeagueVictory } from '@/game/league';
import { readPlayerData } from '@/game/player-storage';
import { registerPokedexAnswer } from '@/game/pokedex';
import { useCallback, type Dispatch } from 'react';
import { clearActiveGame } from '@/game/active-game';
import { trackGameCompleted } from '@/game/analytics';
import { calculateScore, getResponseTime, SCORE_VERSION } from '@/game/game';
import { readTrainerStats, saveResult } from '@/game/storage';
import { getTrainerProgressChanges } from '@/game/trainer';
import type { AnswerResult, GameResult } from '@/game/types';
import type { CompleteGame, GameSession, GameSessionAction } from './session';

interface GameCompletionOptions {
  contentVersion: number;
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  recordDailyCompletion: (result: GameResult, isSaved: boolean) => void;
  refreshTrainerStats: () => void;
  session: GameSession;
  startTimer: () => void;
}

export const useGameCompletion = ({
  contentVersion,
  dispatch,
  pauseTimer,
  recordDailyCompletion,
  refreshTrainerStats,
  session,
  startTimer,
}: GameCompletionOptions) => {
  const complete = useCallback<CompleteGame>(
    ({ answers, mode, modifiers, questions, seed }) => {
      const result = {
        answers,
        contentVersion,
        correctCount: answers.filter(({ correct }) => correct).length,
        ...getResponseTime(answers),
        questionCount: questions.length,
        score: calculateScore(answers),
        scoreVersion: SCORE_VERSION,
      };
      const previousTrainerStats = readTrainerStats();
      const leagueRecord =
        mode.kind === 'league' && isLeagueVictory(result)
          ? createLeagueVictoryRecord(
              result,
              questions,
              seed,
              readPlayerData().profile?.name ?? '',
            )
          : undefined;
      const best = saveResult(mode, result, modifiers, leagueRecord);
      const progressChanges = best.isSaved
        ? getTrainerProgressChanges(previousTrainerStats, readTrainerStats())
        : [];
      clearActiveGame();
      refreshTrainerStats();
      trackGameCompleted(mode, result);
      dispatch({
        bestResult: best.best,
        isNewBest: best.isNewBest,
        result,
        resultSaved: best.isSaved,
        leagueRecord,
        progressChanges,
        type: 'completed',
      });
      if (mode.kind === 'daily') {
        recordDailyCompletion(result, best.isSaved);
      }
      pauseTimer();
    },
    [
      contentVersion,
      dispatch,
      pauseTimer,
      recordDailyCompletion,
      refreshTrainerStats,
    ],
  );

  const recordAnswer = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      const question = session.questions[session.questionIndex];
      if (question) registerPokedexAnswer(question, answer.correct);
      dispatch({ answer, type: 'answer-recorded' });
    },
    [dispatch, session],
  );

  const answerQuestion = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      const nextAnswers =
        session.answers.length === session.questionIndex
          ? [...session.answers, answer]
          : session.answers;

      if (
        session.questionIndex === session.questions.length - 1 ||
        (session.mode.kind === 'league' && !answer.correct)
      ) {
        complete({ ...session, answers: nextAnswers });
        return;
      }

      dispatch({ answer, type: 'advanced' });
      startTimer();
    },
    [complete, dispatch, session, startTimer],
  );

  return { answerQuestion, complete, recordAnswer };
};
