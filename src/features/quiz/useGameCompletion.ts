import { useCallback, useRef, type Dispatch } from 'react';
import {
  recordSessionAnswer,
  type CompleteGame,
  type GameSession,
  type GameSessionAction,
} from '../../app/game-session';
import { createLeagueVictoryRecord } from '../../domain/player/hall-of-fame';
import { getTrainerStats } from '../../domain/player/progress';
import { getTrainerProgressChanges } from '../../domain/player/trainer-progression';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import { DAILY_CHALLENGE_VERSION } from '../../domain/quiz/daily';
import {
  LEAGUE_CHALLENGE_VERSION,
  isLeagueVictory,
} from '../../domain/quiz/league';
import { getQuestionPokemon } from '../../domain/quiz/question-pokemon';
import { snapshotRoundRules } from '../../domain/quiz/round-rules';
import {
  SCORE_VERSION,
  calculateScore,
  getResponseTime,
} from '../../domain/quiz/scoring';
import type { AnswerResult, GameResult } from '../../domain/quiz/types';
import { trainingConfig, versions } from '../../domain/sync/progress';
import { trackGameCompleted } from '../../lib/analytics';
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
  recordDailyCompletion: (
    result: GameResult,
    isSaved: boolean,
    date: string,
  ) => void;
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
    async ({
      answers,
      contentVersion,
      mode,
      settings,
      questions,
      seed,
      scoreMultipliers,
      roundId = seed,
    }) => {
      const completedAt =
        readLocalRound()?.completedAt ??
        completionTimes.current.get(roundId) ??
        new Date().toISOString();
      completionTimes.current.set(roundId, completedAt);
      const result = {
        ...(snapshotRoundRules(settings, questions)
          ? { rules: snapshotRoundRules(settings, questions) }
          : {}),
        ...(mode.kind === 'daily' && mode.track
          ? { dailyTrack: mode.track }
          : {}),
        answers,
        ...(scoreMultipliers ? { scoreMultipliers } : {}),
        contentVersion,
        correctCount: answers.filter(({ correct }) => correct).length,
        ...getResponseTime(answers),
        questionCount: questions.length,
        score: calculateScore(answers, scoreMultipliers),
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
      const best = await commitRoundCompletion(
        {
          recordVersion: 1,
          completionId: roundId,
          completedAt,
          contentVersion,
          scoreVersion: result.scoreVersion,
          progressVersion: versions.progress,
          generatorVersion:
            mode.kind === 'daily'
              ? DAILY_CHALLENGE_VERSION
              : mode.kind === 'league'
                ? LEAGUE_CHALLENGE_VERSION
                : 0,
          mode: mode.kind,
          dailyDate: mode.kind === 'daily' ? mode.date : null,
          training: trainingConfig(settings),
          result,
          discoveries: [
            ...new Set(
              answers.flatMap((answer, index) =>
                answer.correct && questions[index]
                  ? getQuestionPokemon(questions[index])
                  : [],
              ),
            ),
          ].sort(),
          victory: leagueRecord
            ? {
                trainerName: leagueRecord.trainerName,
                pokemon: leagueRecord.pokemon,
              }
            : null,
        },
        leagueRecord,
      );
      const progressChanges = best.isSaved
        ? getTrainerProgressChanges(
            previousTrainerStats,
            readTrainerStats(),
            catalog,
          )
        : [];
      progressStart.current = null;
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
        recordDailyCompletion(result, best.isSaved, mode.date);
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
