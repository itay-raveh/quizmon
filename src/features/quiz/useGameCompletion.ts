import { snapshotRoundRules } from '@/domain/quiz/round-rules';
import {
  recordSessionAnswer,
  type CompleteGame,
  type GameSession,
  type GameSessionAction,
} from '@/app/game-session';
import { createLeagueVictoryRecord } from '@/domain/player/hall-of-fame';
import { getTrainerProgressChanges } from '@/domain/player/trainer-progression';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import { isLeagueVictory } from '@/domain/quiz/league';
import {
  calculateScore,
  getResponseTime,
  SCORE_VERSION,
} from '@/domain/quiz/scoring';
import type { AnswerResult, GameResult } from '@/domain/quiz/types';
import { trackGameCompleted } from '@/lib/analytics';
import {
  clearActiveGame,
  clearDailyAttempt,
} from '@/lib/storage/active-game-storage';
import { readPlayerData } from '@/lib/storage/player-storage';
import { registerPokedexAnswer } from '@/lib/storage/pokedex-storage';
import { useCallback, useRef, type Dispatch } from 'react';
import { getTrainerStats } from '../../domain/player/progress';
import {
  readTrainerStats,
  saveResult,
} from '../../lib/storage/results-storage';

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
  const progressStart = useRef<{
    seed: string;
    stats: ReturnType<typeof readTrainerStats>;
  } | null>(null);
  const complete = useCallback<CompleteGame>(
    ({ answers, contentVersion, mode, settings, questions, seed }) => {
      const result = {
        rules: snapshotRoundRules(settings, questions),
        ...(mode.kind === 'daily' && mode.track
          ? { dailyTrack: mode.track }
          : {}),
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
      const best = saveResult(mode, result, settings, leagueRecord);
      const progressChanges = best.isSaved
        ? getTrainerProgressChanges(
            previousTrainerStats,
            readTrainerStats(),
            catalog,
          )
        : [];
      progressStart.current = null;
      clearActiveGame();
      if (best.isSaved && mode.kind === 'daily' && mode.track)
        clearDailyAttempt(mode.date, mode.track);
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
    [catalog, dispatch, pauseTimer, recordDailyCompletion, refreshTrainerStats],
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
