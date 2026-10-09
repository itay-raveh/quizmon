import { useBlocker } from '@tanstack/react-router';
import { useDailyChallenge } from '@/features/daily/useDailyChallenge';
import { AutomaticUpdate } from '@/features/installation/AutomaticUpdate';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  readUpdateState,
  useUpdateSnapshot,
} from '../lib/storage/update-reload-state';
import { useLeagueChallenge } from '../features/league/useLeagueChallenge';
import { useLeagueDestination } from '../features/league/useLeagueDestination';
import { useGameCompletion } from '../features/quiz/useGameCompletion';
import { useTrainingGame } from '../features/quiz/useTrainingGame';
import { useGameSettings } from '../features/settings/useGameSettings';
import { useSettingsDialog } from '../features/settings/useSettingsDialog';
import { useTrainerCard } from '../features/trainer/useTrainerCard';
import { usePokemonCatalog } from '../hooks/usePokemonCatalog';
import { useStopwatch } from '../hooks/useStopwatch';
import { trackGameStarted } from '../lib/analytics';
import { claimDailyAttempt } from '../lib/storage/round-storage';
import { reportSaveError } from '../lib/storage/player-storage';
import { AppView } from './AppView';
import {
  gameSessionReducer,
  initialGameSession,
  type StartGame,
} from './game-session';
import { useGameNavigation } from './useGameNavigation';
import { AppGameContext } from './AppGameContext';

const useAppGame = () => {
  const leagueDestination = useLeagueDestination();
  const catalogState = usePokemonCatalog();
  const { catalog } = catalogState;
  const [settings, setSettings] = useGameSettings();
  const [session, dispatchSession] = useReducer(
    gameSessionReducer,
    initialGameSession,
    (initial) => readUpdateState('session', initial),
  );
  useUpdateSnapshot('session', session);
  const trainer = useTrainerCard();
  const { getElapsedMilliseconds, pause, reset, running, start } =
    useStopwatch();

  const startingGame = useRef(false);
  const startGame = useCallback<StartGame>(
    async (nextQuestions, nextSettings, nextMode, seed) => {
      if (!catalog || startingGame.current) return false;
      startingGame.current = true;
      const roundId = crypto.randomUUID();
      const startedOn = new Date().toISOString().slice(0, 10);
      try {
        if (
          nextMode.kind === 'daily' &&
          !(await claimDailyAttempt(nextMode.date))
        )
          return false;
        trackGameStarted(nextMode, nextQuestions.length);
        dispatchSession({
          mode: nextMode,
          settings: nextSettings,
          questions: nextQuestions,
          roundId,
          startedOn,
          seed,
          type: 'started',
        });
        reset();
        start();
        return true;
      } catch (error) {
        reportSaveError(error);
        return false;
      } finally {
        startingGame.current = false;
      }
    },
    [catalog, reset, start],
  );

  const training = useTrainingGame({
    catalog,
    settings,
    startGame,
  });

  const { start: startLeague } = useLeagueChallenge({
    catalog,
    settings,
    startGame,
  });

  const daily = useDailyChallenge({
    catalog,
    settings,
    refreshSavedData: trainer.refresh,
    startGame,
  });

  const navigation = useGameNavigation({
    dispatch: dispatchSession,
    pauseTimer: pause,
    resetTimer: reset,
    session,
    startTimer: start,
    timerRunning: running,
  });

  const routeBlocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      session.phase === 'questions' && current.pathname !== next.pathname,
    withResolver: true,
    enableBeforeUnload: false,
  });
  const pausedForRoute = useRef(false);
  useEffect(() => {
    if (routeBlocker.status === 'blocked' && running) {
      pausedForRoute.current = true;
      pause();
    }
  }, [routeBlocker.status, running, pause]);
  const routeLeave = {
    open: routeBlocker.status === 'blocked',
    cancel: () => {
      routeBlocker.reset?.();
      if (pausedForRoute.current) start();
      pausedForRoute.current = false;
    },
    confirm: () => {
      navigation.returnToLanding();
      pausedForRoute.current = false;
      routeBlocker.proceed?.();
    },
  };

  const settingsDialog = useSettingsDialog({
    dispatch: dispatchSession,
    pauseTimer: pause,
    session,
    setSettings,
    startTimer: start,
    timerRunning: running,
  });

  const { answerQuestion, recordAnswer } = useGameCompletion({
    catalog,
    dispatch: dispatchSession,
    pauseTimer: pause,
    recordDailyCompletion: daily.recordCompletion,
    refreshTrainerStats: trainer.refreshStats,
    session,
    startTimer: start,
  });

  useEffect(() => {
    if (session.phase !== 'questions') return;
    const confirmReload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', confirmReload);
    return () => window.removeEventListener('beforeunload', confirmReload);
  }, [session.phase]);
  return {
    catalogState,
    daily,
    league: {
      ...leagueDestination,
      start: async () => {
        if (await startLeague()) leagueDestination.close();
      },
    },
    navigation,
    question: {
      assistance: (count: number) =>
        dispatchSession({ type: 'assistance', count }),
      answer: answerQuestion,
      getElapsedMilliseconds,
      pauseTimer: pause,
      recordAnswer,
      timerRunning: running,
    },
    routeLeave,
    session,
    settings,
    settingsDialog,
    trainer,
    training,
  };
};

export type AppGame = ReturnType<typeof useAppGame>;

export const App = () => {
  const game = useAppGame();
  return (
    <>
      <AutomaticUpdate
        allowed={
          game.session.phase !== 'questions' &&
          (game.catalogState.status === 'error' ||
            game.catalogState.status === 'ready')
        }
      />
      <AppGameContext.Provider value={game}>
        <AppView />
      </AppGameContext.Provider>
    </>
  );
};
