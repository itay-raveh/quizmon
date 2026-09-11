import type { GameSession, GameSessionAction } from '@/app/game-session';
import type { GameSettings } from '@/domain/settings/types';
import { useUpdateState } from '@/features/installation/update-session';
import { useCallback, type Dispatch } from 'react';

interface SettingsDialogOptions {
  dispatch: Dispatch<GameSessionAction>;
  markGenerationKnown: () => void;
  pauseTimer: () => number;
  session: GameSession;
  setSettings: (settings: GameSettings) => void;
  startTimer: () => void;
}

export const useSettingsDialog = ({
  dispatch,
  markGenerationKnown,
  pauseTimer,
  session: { phase },
  setSettings,
  startTimer,
}: SettingsDialogOptions) => {
  const [isOpen, setIsOpen] = useUpdateState('settings-open', false);

  const open = useCallback(() => {
    if (phase === 'questions') pauseTimer();
    setIsOpen(true);
  }, [pauseTimer, phase, setIsOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (phase === 'questions') startTimer();
  }, [phase, startTimer, setIsOpen]);

  const save = useCallback(
    (nextSettings: GameSettings) => {
      setSettings(nextSettings);
      markGenerationKnown();
      if (phase === 'questions' || phase === 'results') {
        dispatch({ settings: nextSettings, type: 'settings-updated' });
      }
      close();
    },
    [close, dispatch, markGenerationKnown, phase, setSettings],
  );

  return { close, open, save, isOpen };
};
