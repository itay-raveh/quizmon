import { AutomaticUpdate } from '@/components/AutomaticUpdate';
import { readUpdateState, useUpdateSnapshot } from '@/pwa/update-state';
import { createRoundSeed } from '@/game/random';
import { useCallback, useReducer, useState } from 'react';
import { readActiveGame } from '@/game/active-game';
import { trackGameStarted } from '@/game/analytics';
import { usePokemonCatalog } from '@/game/catalog';
import { usePersistentModifiers } from '@/game/settings-storage';
import { useStopwatch } from '@/game/stopwatch';
import { AppView } from './AppView';
import {
  gameSessionReducer,
  initialGameSession,
  type StartGame,
} from './session';
import { useActiveGame } from './useActiveGame';
import { useDailyChallenge } from './useDailyChallenge';
import { useGameCompletion } from './useGameCompletion';
import { useGameNavigation } from './useGameNavigation';
import { useLeagueDestination } from './useLeagueDestination';
import { useLeagueChallenge } from './useLeagueChallenge';
import { useSettingsDialog } from './useSettingsDialog';
import { useTrainerCard } from './useTrainerCard';
import { useTrainingGame } from './useTrainingGame';

export const App = () => {
  const leagueDestination = useLeagueDestination();
  const [loadCatalogImmediately] = useState(
    () => window.location.search.length > 0 || readActiveGame() !== null,
  );
  const catalogState = usePokemonCatalog({
    loadImmediately: loadCatalogImmediately,
  });
  const { catalog } = catalogState;
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [session, dispatchSession] = useReducer(
    gameSessionReducer,
    initialGameSession,
    (initial) => readUpdateState('session', initial),
  );
  useUpdateSnapshot('session', session);
  const trainer = useTrainerCard();
  const {
    elapsedMilliseconds,
    elapsedSeconds,
    getElapsedMilliseconds,
    pause,
    reset,
    start,
  } = useStopwatch(modifiers.timerDisplay === 'milliseconds');

  const startGame = useCallback<StartGame>(
    (nextQuestions, nextModifiers, nextMode, seed) => {
      trackGameStarted(nextMode, nextQuestions.length);
      dispatchSession({
        mode: nextMode,
        modifiers: nextModifiers,
        questions: nextQuestions,
        roundId: createRoundSeed(),
        seed,
        type: 'started',
      });
      reset();
      start();
    },
    [reset, start],
  );

  const training = useTrainingGame({
    catalog,
    modifiers,
    session,
    setModifiers,
    startGame,
  });

  const { retry: retryLeague, start: startLeague } = useLeagueChallenge({
    catalog,
    modifiers,
    session,
    startGame,
  });

  const daily = useDailyChallenge({
    catalog,
    modifiers,
    refreshSavedData: trainer.refresh,
    startGame,
  });

  const navigation = useGameNavigation({
    dispatch: dispatchSession,
    pauseTimer: pause,
    resetTimer: reset,
    session,
    startTimer: start,
  });

  const settings = useSettingsDialog({
    dispatch: dispatchSession,
    markGenerationKnown: training.markGenerationKnown,
    pauseTimer: pause,
    session,
    setModifiers,
    startTimer: start,
  });

  const {
    answerQuestion,
    complete: completeGame,
    recordAnswer,
  } = useGameCompletion({
    catalog,
    dispatch: dispatchSession,
    pauseTimer: pause,
    recordDailyCompletion: daily.recordCompletion,
    refreshTrainerStats: trainer.refreshStats,
    session,
    startTimer: start,
  });

  const restoringGame = useActiveGame({
    autoStartDaily: daily.autoStart,
    catalog,
    completeGame,
    dailyDate: daily.date,
    dispatch: dispatchSession,
    elapsedSeconds,
    getElapsedMilliseconds,
    linkedDailyDate: daily.linkedDate,
    resetTimer: reset,
    session,
    startDailyGame: daily.start,
    startTimer: start,
  });

  return (
    <>
      <AutomaticUpdate
        allowed={
          !restoringGame &&
          session.phase !== 'questions' &&
          catalogState.status === 'ready'
        }
      />
      <AppView
        catalogState={catalogState}
        daily={daily}
        modifiers={modifiers}
        league={{
          ...leagueDestination,
          retry: () => {
            leagueDestination.close();
            retryLeague();
          },
          start: () => {
            leagueDestination.close();
            startLeague();
          },
        }}
        navigation={navigation}
        question={{
          answer: answerQuestion,
          elapsedMilliseconds,
          elapsedSeconds,
          pauseTimer: pause,
          recordAnswer,
        }}
        session={session}
        settings={settings}
        trainer={trainer}
        training={training}
      />
    </>
  );
};
