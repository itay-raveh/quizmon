import { useDailyChallenge } from '@/features/daily/useDailyChallenge';
import { AutomaticUpdate } from '@/features/installation/AutomaticUpdate';
import {
  readUpdateState,
  useUpdateSnapshot,
} from '@/features/installation/update-session';
import { useLeagueChallenge } from '@/features/league/useLeagueChallenge';
import { useLeagueDestination } from '@/features/league/useLeagueDestination';
import { useActiveGame } from '@/features/quiz/useActiveGame';
import { useGameCompletion } from '@/features/quiz/useGameCompletion';
import { useTrainingGame } from '@/features/quiz/useTrainingGame';
import { useGameSettings } from '@/features/settings/useGameSettings';
import { useSettingsDialog } from '@/features/settings/useSettingsDialog';
import { useTrainerCard } from '@/features/trainer/useTrainerCard';
import { usePokemonCatalog } from '@/hooks/usePokemonCatalog';
import { useStopwatch } from '@/hooks/useStopwatch';
import { trackGameStarted } from '@/lib/analytics';
import { createRoundSeed } from '@/lib/random';
import {
  clearActiveGame,
  hasActiveGame,
  writeActiveGame,
} from '@/lib/storage/active-game-storage';
import { useCallback, useReducer, useState } from 'react';
import { AppView } from './AppView';
import {
  gameSessionReducer,
  initialGameSession,
  type StartGame,
} from './game-session';
import { useGameNavigation } from './useGameNavigation';

export const App = () => {
  const leagueDestination = useLeagueDestination();
  const [loadCatalogImmediately] = useState(
    () => window.location.search.length > 0 || hasActiveGame(),
  );
  const catalogState = usePokemonCatalog({
    loadImmediately: loadCatalogImmediately,
  });
  const { catalog } = catalogState;
  const [settings, setSettings] = useGameSettings();
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
  } = useStopwatch(settings.timerDisplay === 'milliseconds');

  const startGame = useCallback<StartGame>(
    (nextQuestions, nextSettings, nextMode, seed) => {
      if (!catalog) return;
      const roundId = createRoundSeed();
      if (
        nextMode.kind === 'daily' &&
        nextMode.track &&
        !writeActiveGame({
          questions: nextQuestions,
          questionCount: nextQuestions.length,
          settings: nextSettings,
          mode: nextMode,
          seed,
          roundId,
          answers: [],
          elapsedMilliseconds: 0,
          contentVersion: catalog.contentVersion,
        })
      ) {
        clearActiveGame();
        return false;
      }
      trackGameStarted(nextMode, nextQuestions.length);
      dispatchSession({
        contentVersion: catalog.contentVersion,
        mode: nextMode,
        settings: nextSettings,
        questions: nextQuestions,
        roundId,
        seed,
        type: 'started',
      });
      reset();
      start();
    },
    [catalog, reset, start],
  );

  const training = useTrainingGame({
    catalog,
    settings,
    session,
    setSettings,
    startGame,
  });

  const { retry: retryLeague, start: startLeague } = useLeagueChallenge({
    catalog,
    settings,
    session,
    startGame,
  });

  const daily = useDailyChallenge({
    catalog,
    settings,
    refreshSavedData: trainer.refresh,
    resume: (snapshot) => {
      dispatchSession({ ...snapshot, type: 'restored' });
      reset(snapshot.elapsedMilliseconds);
      if (snapshot.answers.length === snapshot.questions.length)
        completeGame(snapshot);
      else start();
    },
    startGame,
  });

  const navigation = useGameNavigation({
    dispatch: dispatchSession,
    pauseTimer: pause,
    resetTimer: reset,
    session,
    startTimer: start,
  });

  const settingsDialog = useSettingsDialog({
    dispatch: dispatchSession,
    markGenerationKnown: training.markGenerationKnown,
    pauseTimer: pause,
    session,
    setSettings,
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
        settings={settings}
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
          assistance: (count) => dispatchSession({ type: 'assistance', count }),
          answer: answerQuestion,
          elapsedMilliseconds,
          elapsedSeconds,
          pauseTimer: pause,
          recordAnswer,
        }}
        session={session}
        settingsDialog={settingsDialog}
        trainer={trainer}
        training={training}
      />
    </>
  );
};
