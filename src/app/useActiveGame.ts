import { registerShownQuestion } from '@/game/question-history-storage';
import { readPlayerSave } from '@/game/player-storage';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import {
  clearActiveGame,
  readActiveGame,
  writeActiveGame,
  type ActiveGameSnapshot,
} from '@/game/active-game';
import { readDailyResult } from '@/game/storage';
import type { PokemonCatalog } from '@/game/types';
import type { CompleteGame, GameSession, GameSessionAction } from './session';

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
  catalog: PokemonCatalog,
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
    Boolean(readDailyResult(snapshot.mode.date));

  if (
    conflictsWithDailyLink ||
    staleDaily ||
    completedDaily ||
    snapshot.contentVersion !== catalog.contentVersion
  ) {
    return { kind: 'discard', shouldClear: true };
  }

  const questions = snapshot.questions;
  const answersMatchQuestions = snapshot.answers.every(
    (answer, index) =>
      answer.category === questions[index]?.category &&
      answer.generation === questions[index]?.generation &&
      answer.questionType === questions[index]?.questionType &&
      answer.pokemonName === questions[index]?.pokemonName,
  );

  return answersMatchQuestions
    ? { kind: 'restore', snapshot }
    : { kind: 'discard', shouldClear: true };
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
        readActiveGame(),
        catalog,
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
        answers: snapshot.answers,
        mode: snapshot.mode,
        modifiers: snapshot.modifiers,
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
      contentVersion: catalog.contentVersion,
      elapsedMilliseconds: getElapsedMilliseconds(),
      mode: session.mode,
      modifiers: session.modifiers,
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
