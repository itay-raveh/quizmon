import { useState, type Dispatch } from 'react';
import { clearActiveGame } from '../lib/storage/active-game-storage';
import { reportSaveError } from '../lib/storage/player-storage';
import type { GameSession, GameSessionAction } from './game-session';

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

  const returnToLanding = async () => {
    try {
      await clearActiveGame();
    } catch (error) {
      reportSaveError(error);
      return;
    }
    resetTimer();
    setLeaveConfirmationOpen(false);
    dispatch({ type: 'returned-to-landing' });
  };

  const requestLeave = () => {
    if (session.phase !== 'questions' || session.answers.length === 0) {
      void returnToLanding();
      return;
    }

    pauseTimer();
    setLeaveConfirmationOpen(true);
  };

  const cancelLeave = () => {
    setLeaveConfirmationOpen(false);
    startTimer();
  };

  return {
    cancelLeave,
    leaveConfirmationOpen,
    requestLeave,
    returnToLanding,
  };
};
