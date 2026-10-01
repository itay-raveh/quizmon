import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type Dispatch,
} from 'react';
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
  readPlayerRestoreId,
  reportSaveError,
} from '../../lib/storage/player-storage';
import { readDailyResult } from '../../lib/storage/results-storage';

interface ActiveGameOptions {
  autoStartDaily: boolean;
  catalog?: PokemonCatalog;
  completeGame: CompleteGame;
  dispatch: Dispatch<GameSessionAction>;
  getElapsedMilliseconds: () => number;
  resetTimer: (elapsedMilliseconds?: number) => void;
  session: GameSession;
  startDailyGame: () => void;
  startTimer: () => void;
  timerRunning: boolean;
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
    Boolean(readDailyResult(snapshot.mode.date));

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
  getElapsedMilliseconds,
  resetTimer,
  session,
  startDailyGame,
  startTimer,
  timerRunning,
}: ActiveGameOptions) => {
  const restorationAttempted = useRef(false);
  const [restoring, setRestoring] = useState(true);
  const [playerRestoreId] = useState(() => {
    try {
      return readPlayerRestoreId();
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

  const persist = useEffectEvent(() => {
    if (!catalog || session.phase !== 'questions') return;

    void writeActiveGame({
      scoreMultipliers: session.scoreMultipliers,
      answers: session.answers,
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
  });

  useEffect(() => {
    if (session.phase !== 'questions') return;
    const interval = timerRunning
      ? window.setInterval(() => persist(), 1000)
      : undefined;
    const saveWhenHidden = () => {
      if (document.visibilityState === 'hidden') persist();
    };

    document.addEventListener('visibilitychange', saveWhenHidden);
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener('visibilitychange', saveWhenHidden);
    };
  }, [session.phase, timerRunning]);

  return restoring;
};
