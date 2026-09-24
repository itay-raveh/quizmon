import { useRef, useState, type Dispatch } from 'react';
import { clearActiveGame } from '../lib/storage/active-game-storage';
import { reportSaveError } from '../lib/storage/player-storage';
import type { GameSession, GameSessionAction } from './game-session';

interface GameNavigationOptions {
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  resetTimer: (elapsedMilliseconds?: number) => void;
  session: GameSession;
  startDailyGame: () => Promise<void>;
  startTimer: () => void;
  timerRunning: boolean;
}

export const useGameNavigation = ({
  dispatch,
  pauseTimer,
  resetTimer,
  session,
  startDailyGame,
  startTimer,
  timerRunning,
}: GameNavigationOptions) => {
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const [dailyLinkConfirmation, setDailyLinkConfirmation] = useState(false);
  const resumeTimerOnCancel = useRef(false);

  const returnToLanding = async () => {
    try {
      await clearActiveGame();
    } catch (error) {
      reportSaveError(error);
      return false;
    }
    resetTimer();
    setLeaveConfirmationOpen(false);
    setDailyLinkConfirmation(false);
    resumeTimerOnCancel.current = false;
    dispatch({ type: 'returned-to-landing' });
    return true;
  };

  const requestLeave = (forDailyLink = false) => {
    if (
      session.phase !== 'questions' ||
      (!forDailyLink && session.answers.length === 0)
    ) {
      void returnToLanding();
      return;
    }

    if (!leaveConfirmationOpen) resumeTimerOnCancel.current = timerRunning;
    if (resumeTimerOnCancel.current) pauseTimer();
    setDailyLinkConfirmation(forDailyLink);
    setLeaveConfirmationOpen(true);
  };

  const cancelLeave = () => {
    setLeaveConfirmationOpen(false);
    setDailyLinkConfirmation(false);
    if (resumeTimerOnCancel.current) startTimer();
    resumeTimerOnCancel.current = false;
  };

  const confirmLeave = async () => {
    const playDaily = dailyLinkConfirmation;
    if ((await returnToLanding()) && playDaily) await startDailyGame();
  };

  return {
    cancelLeave,
    confirmLeave,
    dailyLinkConfirmation,
    leaveConfirmationOpen,
    requestLeave,
    returnToLanding,
  };
};
