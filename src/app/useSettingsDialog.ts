import { useCallback, useState, type Dispatch } from 'react';
import type { Modifiers } from '@/game/types';
import type { GameSession, GameSessionAction } from './session';

interface SettingsDialogOptions {
  dispatch: Dispatch<GameSessionAction>;
  markGenerationKnown: () => void;
  pauseTimer: () => number;
  session: GameSession;
  setModifiers: (modifiers: Modifiers) => void;
  startTimer: () => void;
}

export const useSettingsDialog = ({
  dispatch,
  markGenerationKnown,
  pauseTimer,
  session,
  setModifiers,
  startTimer,
}: SettingsDialogOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const phase = session.phase;

  const open = useCallback(() => {
    if (phase === 'questions') pauseTimer();
    setIsOpen(true);
  }, [pauseTimer, phase]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (phase === 'questions') startTimer();
  }, [phase, startTimer]);

  const save = useCallback(
    (nextModifiers: Modifiers) => {
      setModifiers(nextModifiers);
      markGenerationKnown();
      if (phase === 'questions' || phase === 'results') {
        dispatch({ modifiers: nextModifiers, type: 'settings-updated' });
      }
      close();
    },
    [close, dispatch, markGenerationKnown, phase, setModifiers],
  );

  return { close, open, save, isOpen };
};
