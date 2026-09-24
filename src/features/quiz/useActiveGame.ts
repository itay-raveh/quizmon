import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type {
  CompleteGame,
  GameSession,
  GameSessionAction,
} from '../../app/game-session';
import type { PokemonCatalog } from '../../domain/pokemon/types';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
  type ActiveGameSnapshot,
} from '../../lib/storage/active-game-storage';
import {
  readPlayerSave,
  reportSaveError,
} from '../../lib/storage/player-storage';
import { registerShownQuestion } from '../../lib/storage/question-history-storage';
import { readDailyResult } from '../../lib/storage/results-storage';

interface ActiveGameOptions {
  autoStartDaily: boolean;
  catalog?: PokemonCatalog;
  completeGame: CompleteGame;
  dispatch: Dispatch<GameSessionAction>;
  elapsedSeconds: number;
  getElapsedMilliseconds: () => number;
  resetTimer: (elapsedMilliseconds?: number) => void;
  session: GameSession;
  startDailyGame: () => void;
  startTimer: () => void;
}

type Restoration =
  | { kind: 'discard'; shouldClear: boolean }
  | { kind: 'restore'; snapshot: ActiveGameSnapshot };

const resolveRestoration = (
  snapshot: ActiveGameSnapshot | null,
): Restoration => {
  if (!snapshot) return { kind: 'discard', shouldClear: false };

  const completedDaily =
    snapshot.mode.kind === 'daily' &&
    Boolean(readDailyResult(snapshot.mode.date, snapshot.mode.track));

  const finished = snapshot.answers.length === snapshot.questionCount;
  if (completedDaily && !finished) {
    return { kind: 'discard', shouldClear: true };
  }

  return { kind: 'restore', snapshot };
};

export const useActiveGame = ({
  autoStartDaily,
  catalog,
  completeGame,
  dispatch,
  elapsedSeconds,
  getElapsedMilliseconds,
  resetTimer,
  session,
  startDailyGame,
  startTimer,
}: ActiveGameOptions) => {
  const restorationAttempted = useRef(false);
  const [restoring, setRestoring] = useState(true);
  const [playerRestoreId] = useState(() => {
    try {
      return readPlayerSave().restoreId;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!catalog || restorationAttempted.current) return;
    const timeoutId = window.setTimeout(() => {
      if (restorationAttempted.current) return;
      restorationAttempted.current = true;
      setRestoring(false);
      if (session.phase === 'results') return;

      const restoration = resolveRestoration(readActiveGame(catalog));
      if (restoration.kind === 'discard') {
        if (restoration.shouldClear)
          void clearActiveGame().catch(reportSaveError);
        if (autoStartDaily && session.phase === 'landing') startDailyGame();
        return;
      }

      const { snapshot } = restoration;
      const { questions } = snapshot;
      const round = {
        scoreMultipliers: snapshot.scoreMultipliers,
        contentVersion: snapshot.contentVersion,
        answers: snapshot.answers,
        mode: snapshot.mode,
        settings: snapshot.settings,
        questions,
        seed: snapshot.seed,
        roundId: snapshot.roundId,
        startedOn:
          snapshot.startedOn ??
          (snapshot.mode.kind === 'daily' ? snapshot.mode.date : undefined),
      };
      dispatch({ ...round, type: 'restored' });
      resetTimer(snapshot.elapsedMilliseconds);

      if (
        snapshot.answers.length === questions.length ||
        (snapshot.mode.kind === 'league' &&
          snapshot.answers.some(({ correct }) => !correct))
      ) {
        void Promise.resolve(completeGame(round)).catch((error: unknown) =>
          reportSaveError(error, async () => completeGame(round)),
        );
      } else {
        startTimer();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoStartDaily,
    catalog,
    completeGame,
    dispatch,
    resetTimer,
    session.phase,
    startDailyGame,
    startTimer,
  ]);

  const visibleQuestion =
    session.phase === 'questions' &&
    session.answers.length < session.questions.length &&
    !(
      session.mode.kind === 'league' &&
      session.answers.some(({ correct }) => !correct)
    )
      ? session.questions[session.questionIndex]
      : undefined;
  const roundId = session.phase === 'questions' ? session.roundId : '';
  const questionIndex =
    session.phase === 'questions' ? session.questionIndex : 0;
  useEffect(() => {
    if (visibleQuestion)
      void registerShownQuestion(
        visibleQuestion,
        roundId,
        questionIndex,
        playerRestoreId,
      );
  }, [visibleQuestion, roundId, questionIndex, playerRestoreId]);

  const persist = useCallback(() => {
    if (!catalog || session.phase !== 'questions') return;

    void writeActiveGame({
      scoreMultipliers: session.scoreMultipliers,
      answers: session.answers,
      contentVersion: session.contentVersion,
      elapsedMilliseconds: getElapsedMilliseconds(),
      mode: session.mode,
      settings: session.settings,
      questionCount: session.questions.length,
      questions: session.questions,
      roundId: session.roundId,
      startedOn: session.startedOn,
      playerRestoreId,
      seed: session.seed,
    }).catch(reportSaveError);
  }, [catalog, getElapsedMilliseconds, playerRestoreId, session]);

  useEffect(() => {
    persist();
  }, [elapsedSeconds, persist]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') persist();
    };

    document.addEventListener('visibilitychange', saveWhenHidden);
    return () =>
      document.removeEventListener('visibilitychange', saveWhenHidden);
  }, [persist]);

  return restoring;
};
