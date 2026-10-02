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

export const App = () => {
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
    setSettings,
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
    startDailyGame: daily.start,
    startTimer: start,
    timerRunning: running,
  });

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

  const autoStartedDaily = useRef<string | null>(null);
  useEffect(() => {
    if (!daily.autoStart) {
      autoStartedDaily.current = null;
      return;
    }
    if (!catalog || session.phase !== 'landing') return;
    if (autoStartedDaily.current === daily.date) return;
    autoStartedDaily.current = daily.date;
    void daily.start();
  }, [catalog, daily, session.phase]);
  useEffect(() => {
    if (session.phase !== 'questions') return;
    const confirmReload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener('beforeunload', confirmReload);
    return () => window.removeEventListener('beforeunload', confirmReload);
  }, [session.phase]);
  const promptedDailyLink = useRef<string | null>(null);
  useEffect(() => {
    if (!daily.linkedDate) {
      promptedDailyLink.current = null;
      return;
    }
    if (session.phase !== 'questions') return;
    if (session.mode.kind === 'daily' && session.mode.date === daily.linkedDate)
      return;
    const key = `${daily.linkedDate}:${session.roundId}`;
    if (promptedDailyLink.current === key) return;
    promptedDailyLink.current = key;
    navigation.requestLeave(true);
  }, [daily.linkedDate, navigation, session]);

  return (
    <>
      <AutomaticUpdate
        allowed={
          session.phase !== 'questions' &&
          (catalogState.status === 'error' || catalogState.status === 'ready')
        }
      />
      <AppView
        catalogState={catalogState}
        daily={daily}
        settings={settings}
        league={{
          ...leagueDestination,
          start: async () => {
            if (await startLeague()) leagueDestination.close();
          },
        }}
        navigation={navigation}
        question={{
          assistance: (count) => dispatchSession({ type: 'assistance', count }),
          answer: answerQuestion,
          getElapsedMilliseconds,
          pauseTimer: pause,
          recordAnswer,
          timerRunning: running,
        }}
        session={session}
        settingsDialog={settingsDialog}
        trainer={trainer}
        training={training}
      />
    </>
  );
};
