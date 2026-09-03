import { useCallback, useState, type Dispatch } from 'react';
import { clearActiveGame } from '@/game/active-game';
import type { GameSession, GameSessionAction } from './session';

interface GameNavigationOptions {
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  resetTimer: (elapsedMilliseconds?: number) => void;
  session: GameSession;
  startTimer: () => void;
}

export const useGameNavigation = ({
  dispatch,
  pauseTimer,
  resetTimer,
  session,
  startTimer,
}: GameNavigationOptions) => {
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);

  const returnToLanding = useCallback(() => {
    clearActiveGame();
    pauseTimer();
    resetTimer();
    setLeaveConfirmationOpen(false);
    dispatch({ type: 'returned-to-landing' });
  }, [dispatch, pauseTimer, resetTimer]);

  const requestLeave = useCallback(() => {
    if (session.phase !== 'questions' || session.answers.length === 0) {
      returnToLanding();
      return;
    }

    pauseTimer();
    setLeaveConfirmationOpen(true);
  }, [pauseTimer, returnToLanding, session]);

  const cancelLeave = useCallback(() => {
    setLeaveConfirmationOpen(false);
    startTimer();
  }, [startTimer]);

  return {
    cancelLeave,
    leaveConfirmationOpen,
    requestLeave,
    returnToLanding,
  };
};
