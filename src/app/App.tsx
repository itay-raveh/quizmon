import { getTrainingScoreMultipliers } from '@/domain/quiz/score-multipliers';
import { useDailyChallenge } from '@/features/daily/useDailyChallenge';
import { AutomaticUpdate } from '@/features/installation/AutomaticUpdate';
import { useCallback, useReducer, useRef } from 'react';
import {
  readUpdateState,
  useUpdateSnapshot,
} from '../lib/storage/update-reload-state';
import { useLeagueChallenge } from '../features/league/useLeagueChallenge';
import { useLeagueDestination } from '../features/league/useLeagueDestination';
import { useActiveGame } from '../features/quiz/useActiveGame';
import { useGameCompletion } from '../features/quiz/useGameCompletion';
import { useTrainingGame } from '../features/quiz/useTrainingGame';
import { useGameSettings } from '../features/settings/useGameSettings';
import { useSettingsDialog } from '../features/settings/useSettingsDialog';
import { useTrainerCard } from '../features/trainer/useTrainerCard';
import { usePokemonCatalog } from '../hooks/usePokemonCatalog';
import { useStopwatch } from '../hooks/useStopwatch';
import { trackGameStarted } from '../lib/analytics';
import { writeActiveGame } from '../lib/storage/active-game-storage';
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
  const {
    elapsedMilliseconds,
    elapsedSeconds,
    getElapsedMilliseconds,
    pause,
    reset,
    running,
    start,
  } = useStopwatch(settings.timerDisplay === 'milliseconds');

  const startingGame = useRef(false);
  const startGame = useCallback<StartGame>(
    async (nextQuestions, nextSettings, nextMode, seed) => {
      if (!catalog || startingGame.current) return false;
      startingGame.current = true;
      const roundId = crypto.randomUUID();
      const startedOn = new Date().toISOString().slice(0, 10);
      try {
        const scoring =
          nextMode.kind === 'training'
            ? {
                scoreMultipliers: getTrainingScoreMultipliers(
                  nextSettings,
                  nextQuestions,
                ),
              }
            : {};
        await writeActiveGame({
          answers: [],
          contentVersion: catalog.contentVersion,
          mode: nextMode,
          settings: nextSettings,
          questions: nextQuestions,
          questionCount: nextQuestions.length,
          roundId,
          startedOn,
          seed,
          ...scoring,
          elapsedMilliseconds: 0,
        });
        trackGameStarted(nextMode, nextQuestions.length);
        dispatchSession({
          contentVersion: catalog.contentVersion,
          mode: nextMode,
          settings: nextSettings,
          questions: nextQuestions,
          roundId,
          startedOn,
          seed,
          type: 'started',
          ...scoring,
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
    resume: (snapshot) => {
      dispatchSession({ ...snapshot, type: 'restored' });
      reset(snapshot.elapsedMilliseconds);
      if (snapshot.answers.length === snapshot.questions.length)
        void Promise.resolve(completeGame(snapshot)).catch(reportSaveError);
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
    dispatch: dispatchSession,
    elapsedSeconds,
    getElapsedMilliseconds,
    linkedDailyDate: daily.linkedDate,
    resetTimer: reset,
    session,
    startDailyGame: () => {
      void daily.start();
    },
    startTimer: start,
  });

  return (
    <>
      <AutomaticUpdate
        allowed={
          session.phase !== 'questions' &&
          (catalogState.status === 'error' ||
            (!restoringGame && catalogState.status === 'ready'))
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
