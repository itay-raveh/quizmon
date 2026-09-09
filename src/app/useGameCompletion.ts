import { createLeagueVictoryRecord } from '@/game/hall-of-fame';
import { isLeagueVictory } from '@/game/league';
import { readPlayerData } from '@/game/player-storage';
import { registerPokedexAnswer } from '@/game/pokedex';
import { useCallback, useRef, type Dispatch } from 'react';
import { clearActiveGame } from '@/game/active-game';
import { trackGameCompleted } from '@/game/analytics';
import { calculateScore, getResponseTime, SCORE_VERSION } from '@/game/scoring';
import { getTrainerStats, readTrainerStats, saveResult } from '@/game/storage';
import { getTrainerProgressChanges } from '@/game/trainer';
import type { AnswerResult, GameResult, PokemonCatalog } from '@/game/types';
import {
  recordSessionAnswer,
  type CompleteGame,
  type GameSession,
  type GameSessionAction,
} from './session';

interface GameCompletionOptions {
  catalog?: PokemonCatalog;
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  recordDailyCompletion: (result: GameResult, isSaved: boolean) => void;
  refreshTrainerStats: () => void;
  session: GameSession;
  startTimer: () => void;
}

export const useGameCompletion = ({
  catalog,
  dispatch,
  pauseTimer,
  recordDailyCompletion,
  refreshTrainerStats,
  session,
  startTimer,
}: GameCompletionOptions) => {
  const contentVersion = catalog?.contentVersion ?? 0;
  const progressStart = useRef<{
    seed: string;
    stats: ReturnType<typeof readTrainerStats>;
  } | null>(null);
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
      const previousData = readPlayerData();
      const previousTrainerStats =
        progressStart.current?.seed === seed
          ? progressStart.current.stats
          : getTrainerStats(previousData.results, previousData.pokedex);
      const leagueRecord =
        mode.kind === 'league' && isLeagueVictory(result)
          ? createLeagueVictoryRecord(
              result,
              questions,
              seed,
              previousData.profile?.name ?? '',
            )
          : undefined;
      const best = saveResult(mode, result, modifiers, leagueRecord);
      const progressChanges = best.isSaved
        ? getTrainerProgressChanges(
            previousTrainerStats,
            readTrainerStats(),
            catalog,
          )
        : [];
      progressStart.current = null;
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
      catalog,
      dispatch,
      pauseTimer,
      recordDailyCompletion,
      refreshTrainerStats,
    ],
  );

  const recordAnswer = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      if (progressStart.current?.seed !== session.seed) {
        progressStart.current = {
          seed: session.seed,
          stats: readTrainerStats(),
        };
      }
      const question = session.questions[session.questionIndex];
      if (question) registerPokedexAnswer(question, answer.correct);
      dispatch({ answer, type: 'answer-recorded' });
    },
    [dispatch, session],
  );

  const answerQuestion = useCallback(
    (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      if (
        session.questionIndex === session.questions.length - 1 ||
        (session.mode.kind === 'league' && !answer.correct)
      ) {
        complete(recordSessionAnswer(session, answer));
        return;
      }

      dispatch({ answer, type: 'advanced' });
      startTimer();
    },
    [complete, dispatch, session, startTimer],
  );

  return { answerQuestion, complete, recordAnswer };
};
