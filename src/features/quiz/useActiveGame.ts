import type {
  CompleteGame,
  GameSession,
  GameSessionAction,
} from '@/app/game-session';
import type { PokemonCatalog } from '@/domain/pokemon/types';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
  type ActiveGameSnapshot,
} from '@/lib/storage/active-game-storage';
import { readPlayerSave } from '@/lib/storage/player-storage';
import { registerShownQuestion } from '@/lib/storage/question-history-storage';
import { readDailyResult } from '@/lib/storage/results-storage';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';

interface ActiveGameOptions {
  autoStartDaily: boolean;
  catalog?: PokemonCatalog;
  completeGame: CompleteGame;
  dailyDate: string;
  dispatch: Dispatch<GameSessionAction>;
  elapsedSeconds: number;
  getElapsedMilliseconds: () => number;
  linkedDailyDate: string | null;
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
  dailyDate: string,
  linkedDailyDate: string | null,
): Restoration => {
  if (!snapshot) return { kind: 'discard', shouldClear: false };

  const conflictsWithDailyLink =
    linkedDailyDate !== null &&
    (snapshot.mode.kind !== 'daily' || snapshot.mode.date !== linkedDailyDate);
  const staleDaily =
    snapshot.mode.kind === 'daily' && snapshot.mode.date !== dailyDate;
  const completedDaily =
    snapshot.mode.kind === 'daily' &&
    Boolean(readDailyResult(snapshot.mode.date, snapshot.mode.track));

  if (conflictsWithDailyLink || staleDaily || completedDaily) {
    return { kind: 'discard', shouldClear: true };
  }

  return { kind: 'restore', snapshot };
};

export const useActiveGame = ({
  autoStartDaily,
  catalog,
  completeGame,
  dailyDate,
  dispatch,
  elapsedSeconds,
  getElapsedMilliseconds,
  linkedDailyDate,
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

      const restoration = resolveRestoration(
        readActiveGame(catalog),
        dailyDate,
        linkedDailyDate,
      );
      if (restoration.kind === 'discard') {
        if (restoration.shouldClear) clearActiveGame();
        if (autoStartDaily && session.phase === 'landing') startDailyGame();
        return;
      }

      const { snapshot } = restoration;
      const { questions } = snapshot;
      const round = {
        contentVersion: snapshot.contentVersion,
        answers: snapshot.answers,
        mode: snapshot.mode,
        settings: snapshot.settings,
        questions,
        seed: snapshot.seed,
        roundId: snapshot.roundId ?? snapshot.seed,
      };
      dispatch({ ...round, type: 'restored' });
      resetTimer(snapshot.elapsedMilliseconds);

      if (
        snapshot.answers.length === questions.length ||
        (snapshot.mode.kind === 'league' &&
          snapshot.answers.some(({ correct }) => !correct))
      ) {
        completeGame(round);
      } else {
        startTimer();
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    autoStartDaily,
    catalog,
    completeGame,
    dailyDate,
    dispatch,
    linkedDailyDate,
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
  const roundId =
    session.phase === 'questions' ? (session.roundId ?? session.seed) : '';
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

    writeActiveGame({
      answers: session.answers,
      contentVersion: session.contentVersion,
      elapsedMilliseconds: getElapsedMilliseconds(),
      mode: session.mode,
      settings: session.settings,
      questionCount: session.questions.length,
      questions: session.questions,
      roundId: session.roundId ?? session.seed,
      playerRestoreId,
      seed: session.seed,
    });
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
