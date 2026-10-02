import { useRef, useState, type Dispatch } from 'react';
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

  const returnToLanding = () => {
    resetTimer();
    setLeaveConfirmationOpen(false);
    setDailyLinkConfirmation(false);
    resumeTimerOnCancel.current = false;
    dispatch({ type: 'returned-to-landing' });
  };

  const requestLeave = (forDailyLink = false) => {
    if (
      session.phase !== 'questions' ||
      (!forDailyLink &&
        session.answers.length === 0 &&
        session.mode.kind !== 'daily')
    ) {
      returnToLanding();
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
    returnToLanding();
    if (playDaily) await startDailyGame();
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
