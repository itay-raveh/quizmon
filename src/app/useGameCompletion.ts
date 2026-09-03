import { useCallback, type Dispatch } from 'react';
import { clearActiveGame } from '@/game/active-game';
import { trackGameCompleted } from '@/game/analytics';
import {
  calculateScore,
  getResponseTimeSeconds,
  SCORE_VERSION,
} from '@/game/game';
import { saveResult } from '@/game/storage';
import type {
  AnswerResult,
  GameMode,
  GameResult,
  Modifiers,
} from '@/game/types';
import type { GameSession, GameSessionAction } from './session';

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
  const complete = useCallback(
    (
      answers: AnswerResult[],
      mode: GameMode,
      modifiers: Modifiers,
      questionCount: number,
    ) => {
      const result = {
        answers,
        contentVersion,
        correctCount: answers.filter(({ correct }) => correct).length,
        elapsedSeconds: getResponseTimeSeconds(answers),
        questionCount,
        score: calculateScore(answers),
        scoreVersion: SCORE_VERSION,
      };
      const best = saveResult(mode, result, modifiers);
      clearActiveGame();
      refreshTrainerStats();
      trackGameCompleted(mode, result);
      dispatch({
        bestResult: best.best,
        isNewBest: best.isNewBest,
        result,
        resultSaved: best.isSaved,
        type: 'completed',
      });
      if (mode.kind === 'daily') {
        recordDailyCompletion(best.best, best.isSaved);
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
      dispatch({ answer, type: 'answer-recorded' });
    },
    [dispatch],
  );

  const answerQuestion = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      const nextAnswers =
        session.answers.length === session.questionIndex
          ? [...session.answers, answer]
          : session.answers;

      if (session.questionIndex === session.questions.length - 1) {
        complete(
          nextAnswers,
          session.mode,
          session.modifiers,
          session.questions.length,
        );
        return;
      }

      dispatch({ answer, type: 'advanced' });
      startTimer();
    },
    [complete, dispatch, session, startTimer],
  );

  return { answerQuestion, complete, recordAnswer };
};
