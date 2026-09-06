import { useCallback, useReducer, useState } from 'react';
import { readActiveGame } from '@/game/active-game';
import { trackGameStarted } from '@/game/analytics';
import { usePokemonCatalog } from '@/game/catalog';
import { usePersistentModifiers } from '@/game/settings-storage';
import { useStopwatch } from '@/game/stopwatch';
import type { GameMode, Modifiers, QuestionData } from '@/game/types';
import { AppView } from './AppView';
import { gameSessionReducer, initialGameSession } from './session';
import { useActiveGame } from './useActiveGame';
import { useDailyChallenge } from './useDailyChallenge';
import { useGameCompletion } from './useGameCompletion';
import { useGameNavigation } from './useGameNavigation';
import { useLeagueChallenge } from './useLeagueChallenge';
import { useSettingsDialog } from './useSettingsDialog';
import { useTrainerCard } from './useTrainerCard';
import { useTrainingGame } from './useTrainingGame';

export const App = () => {
  const [loadCatalogImmediately] = useState(
    () => window.location.search.length > 0 || readActiveGame() !== null,
  );
  const catalogState = usePokemonCatalog({
    loadImmediately: loadCatalogImmediately,
  });
  const [modifiers, setModifiers] = usePersistentModifiers();
  const [session, dispatchSession] = useReducer(
    gameSessionReducer,
    initialGameSession,
  );
  const {
    close: closeTrainerCard,
    isOpen: trainerCardOpen,
    open: openTrainerCard,
    profile: trainerProfile,
    refresh: refreshTrainerCard,
    refreshStats: refreshTrainerStats,
    showView: showTrainerView,
    stats: trainerStats,
    updateProfile: updateTrainerProfile,
    view: trainerView,
  } = useTrainerCard();
  const {
    elapsedMilliseconds,
    elapsedSeconds,
    getElapsedMilliseconds,
    pause,
    reset,
    start,
  } = useStopwatch(modifiers.timerDisplay === 'milliseconds');

  const startGame = useCallback(
    (
      nextQuestions: QuestionData[],
      nextModifiers: Modifiers,
      nextMode: GameMode,
      seed: string,
    ) => {
      trackGameStarted(nextMode, nextQuestions.length);
      dispatchSession({
        mode: nextMode,
        modifiers: nextModifiers,
        questions: nextQuestions,
        seed,
        type: 'started',
      });
      reset();
      start();
    },
    [reset, start],
  );

  const {
    chooseAllGenerations,
    chooseGenOne,
    closeGenerationPrompt,
    generationPromptOpen,
    markGenerationKnown,
    start: startTrainingGame,
    trainAgain,
  } = useTrainingGame({
    catalog: catalogState.status === 'ready' ? catalogState.catalog : undefined,
    modifiers,
    session,
    setModifiers,
    startGame,
  });

  const { retry: retryLeague, start: startLeague } = useLeagueChallenge({
    catalog: catalogState.status === 'ready' ? catalogState.catalog : undefined,
    modifiers,
    session,
    startGame,
  });

  const {
    autoStart: autoStartDaily,
    date: dailyDate,
    linkedDate: linkedDailyDate,
    recordCompletion: recordDailyCompletion,
    result: dailyResult,
    resultSaved: dailyResultSaved,
    start: startDailyGame,
    storageAvailable,
    streak: dailyStreak,
  } = useDailyChallenge({
    catalog: catalogState.status === 'ready' ? catalogState.catalog : undefined,
    modifiers,
    refreshSavedData: refreshTrainerCard,
    startGame,
  });

  const {
    cancelLeave: cancelLeaveGame,
    leaveConfirmationOpen,
    requestLeave: requestLeaveGame,
    returnToLanding: newGame,
  } = useGameNavigation({
    dispatch: dispatchSession,
    pauseTimer: pause,
    resetTimer: reset,
    session,
    startTimer: start,
  });

  const {
    close: closeSettings,
    open: openSettings,
    save: saveSettings,
    settings,
  } = useSettingsDialog({
    dispatch: dispatchSession,
    markGenerationKnown,
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
    contentVersion:
      catalogState.status === 'ready' ? catalogState.catalog.contentVersion : 0,
    dispatch: dispatchSession,
    pauseTimer: pause,
    recordDailyCompletion,
    refreshTrainerStats,
    session,
    startTimer: start,
  });

  useActiveGame({
    autoStartDaily,
    catalog: catalogState.status === 'ready' ? catalogState.catalog : undefined,
    completeGame,
    dailyDate,
    dispatch: dispatchSession,
    elapsedSeconds,
    getElapsedMilliseconds,
    linkedDailyDate,
    resetTimer: reset,
    session,
    startDailyGame,
    startTimer: start,
  });

  return (
    <AppView
      catalogState={catalogState}
      daily={{
        date: dailyDate,
        result: dailyResult,
        resultSaved: dailyResultSaved,
        start: startDailyGame,
        storageAvailable,
        streak: dailyStreak,
      }}
      modifiers={modifiers}
      league={{ retry: retryLeague, start: startLeague }}
      navigation={{
        cancelLeave: cancelLeaveGame,
        leaveConfirmationOpen,
        requestLeave: requestLeaveGame,
        returnToLanding: newGame,
      }}
      question={{
        answer: answerQuestion,
        elapsedMilliseconds,
        elapsedSeconds,
        pauseTimer: pause,
        recordAnswer,
      }}
      session={session}
      settings={{
        close: closeSettings,
        open: openSettings,
        save: saveSettings,
        state: settings,
      }}
      trainer={{
        close: closeTrainerCard,
        isOpen: trainerCardOpen,
        open: openTrainerCard,
        profile: trainerProfile,
        stats: trainerStats,
        showView: showTrainerView,
        updateProfile: updateTrainerProfile,
        view: trainerView,
      }}
      training={{
        chooseAllGenerations,
        chooseGenOne,
        closeGenerationPrompt,
        generationPromptOpen,
        start: startTrainingGame,
        trainAgain,
      }}
    />
  );
};
