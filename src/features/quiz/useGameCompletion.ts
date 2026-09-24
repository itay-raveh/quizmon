import { useCallback, useRef, type Dispatch } from 'react';
import {
  recordSessionAnswer,
  type CompleteGame,
  type GameSession,
  type GameSessionAction,
} from '../../app/game-session';
import { completeRound } from '../../domain/player/game-history';
import { getTrainerStats } from '../../domain/player/progress';
import { getTrainerProgressChanges } from '../../domain/player/trainer-progression';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { getResponseTime } from '../../domain/quiz/scoring';
import type { AnswerResult, GameResult } from '../../domain/quiz/types';
import { writeActiveGame } from '../../lib/storage/active-game-storage';
import {
  readPlayerData,
  reportSaveError,
} from '../../lib/storage/player-storage';
import { readTrainerStats } from '../../lib/storage/results-storage';
import {
  commitRoundCompletion,
  readLocalRound,
} from '../../lib/storage/round-storage';

interface GameCompletionOptions {
  catalog?: PokemonCatalog;
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  recordDailyCompletion: (result: GameResult, date: string) => void;
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
  const completionTimes = useRef(new Map<string, string>());
  const complete = useCallback<CompleteGame>(
    async (round) => {
      const { mode, seed, roundId } = round;
      const completedAt =
        readLocalRound()?.completedAt ??
        completionTimes.current.get(roundId) ??
        new Date().toISOString();
      completionTimes.current.set(roundId, completedAt);
      const previousData = readPlayerData();
      const previousTrainerStats =
        progressStart.current?.seed === seed
          ? progressStart.current.stats
          : getTrainerStats(previousData.results, previousData.pokedex);
      const { completion, victory: leagueRecord } = await completeRound(
        round,
        completedAt,
        previousData.profile?.name ?? '',
      );
      const { result } = completion;
      const best = await commitRoundCompletion(
        completion,
        leagueRecord,
        false,
        round.startedOn,
      );
      const progressChanges = getTrainerProgressChanges(
        previousTrainerStats,
        readTrainerStats(),
        catalog,
      );
      progressStart.current = null;
      refreshTrainerStats();
      dispatch({
        bestResult: best.best,
        isNewBest: best.isNewBest,
        result,
        resultSaved: true,
        leagueRecord,
        progressChanges,
        type: 'completed',
      });
      if (mode.kind === 'daily') {
        recordDailyCompletion(result, mode.date);
      }
      pauseTimer();
    },
    [catalog, dispatch, pauseTimer, recordDailyCompletion, refreshTrainerStats],
  );

  const recordAnswer = useCallback(
    async (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      if (progressStart.current?.seed !== session.seed) {
        progressStart.current = {
          seed: session.seed,
          stats: readTrainerStats(),
        };
      }
      const round = recordSessionAnswer(session, answer);
      await writeActiveGame({
        ...round,
        questionCount: round.questions.length,
        elapsedMilliseconds: getResponseTime(round.answers).elapsedMilliseconds,
      });
      dispatch({ answer, type: 'answer-recorded' });
    },
    [dispatch, session],
  );

  const answerQuestion = useCallback(
    async (answer: AnswerResult) => {
      if (session.phase !== 'questions') return;
      try {
        if (
          session.questionIndex === session.questions.length - 1 ||
          (session.mode.kind === 'league' && !answer.correct)
        ) {
          await complete(recordSessionAnswer(session, answer));
          return;
        }

        dispatch({ answer, type: 'advanced' });
        startTimer();
      } catch (error) {
        reportSaveError(error);
        throw error;
      }
    },
    [complete, dispatch, session, startTimer],
  );

  return { answerQuestion, complete, recordAnswer };
};
