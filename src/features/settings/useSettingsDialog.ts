import { useCallback, type Dispatch } from 'react';
import type { GameSession, GameSessionAction } from '../../app/game-session';
import type { GameSettings } from '../../domain/settings/types';
import { useUpdateState } from '../installation/update-session';
import type { SettingsSection } from './SettingsDialog';

interface SettingsDialogOptions {
  dispatch: Dispatch<GameSessionAction>;
  markGenerationKnown: () => void;
  pauseTimer: () => number;
  session: GameSession;
  setSettings: (settings: GameSettings) => Promise<boolean>;
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
  const [section, setSection] = useUpdateState<SettingsSection>(
    'settings-section',
    'general',
  );

  const openSection = useCallback(
    (nextSection: SettingsSection) => {
      if (phase === 'questions') pauseTimer();
      setSection(nextSection);
      setIsOpen(true);
    },
    [pauseTimer, phase, setIsOpen, setSection],
  );
  const open = useCallback(() => openSection('general'), [openSection]);
  const openTraining = useCallback(
    () => openSection('training'),
    [openSection],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    if (phase === 'questions') startTimer();
  }, [phase, startTimer, setIsOpen]);

  const save = useCallback(
    async (nextSettings: GameSettings) => {
      if (!(await setSettings(nextSettings))) return;
      markGenerationKnown();
      if (phase === 'questions' || phase === 'results') {
        dispatch({ settings: nextSettings, type: 'settings-updated' });
      }
      close();
    },
    [close, dispatch, markGenerationKnown, phase, setSettings],
  );

  return { close, open, openTraining, save, isOpen, section };
};
