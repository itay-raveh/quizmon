import type { Dispatch } from 'react';
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

  const openSection = (nextSection: SettingsSection) => {
    if (phase === 'questions') pauseTimer();
    setSection(nextSection);
    setIsOpen(true);
  };
  const open = () => openSection('general');
  const openTraining = () => openSection('training');

  const close = () => {
    setIsOpen(false);
    if (phase === 'questions') startTimer();
  };

  const save = async (nextSettings: GameSettings) => {
    if (!(await setSettings(nextSettings))) return;
    markGenerationKnown();
    if (phase === 'questions' || phase === 'results') {
      dispatch({ settings: nextSettings, type: 'settings-updated' });
    }
    close();
  };

  return { close, open, openTraining, save, isOpen, section };
};
