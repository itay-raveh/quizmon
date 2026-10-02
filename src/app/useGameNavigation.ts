import { useRef, useState, type Dispatch } from 'react';
import type { GameSession, GameSessionAction } from './game-session';

interface GameNavigationOptions {
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  resetTimer: (elapsedMilliseconds?: number) => void;
  session: GameSession;
  startTimer: () => void;
  timerRunning: boolean;
}

export const useGameNavigation = ({
  dispatch,
  pauseTimer,
  resetTimer,
  session,
  startTimer,
  timerRunning,
}: GameNavigationOptions) => {
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const resumeTimerOnCancel = useRef(false);

  const returnToLanding = () => {
    resetTimer();
    setLeaveConfirmationOpen(false);
    resumeTimerOnCancel.current = false;
    dispatch({ type: 'returned-to-landing' });
  };

  const requestLeave = () => {
    if (
      session.phase !== 'questions' ||
      (session.answers.length === 0 && session.mode.kind !== 'daily')
    ) {
      returnToLanding();
      return;
    }

    if (!leaveConfirmationOpen) resumeTimerOnCancel.current = timerRunning;
    if (resumeTimerOnCancel.current) pauseTimer();
    setLeaveConfirmationOpen(true);
  };

  const cancelLeave = () => {
    setLeaveConfirmationOpen(false);
    if (resumeTimerOnCancel.current) startTimer();
    resumeTimerOnCancel.current = false;
  };

  const confirmLeave = () => {
    returnToLanding();
  };

  return {
    cancelLeave,
    confirmLeave,
    leaveConfirmationOpen,
    requestLeave,
    returnToLanding,
  };
};
