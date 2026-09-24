import { useRef, type Dispatch } from 'react';
import type { GameSession, GameSessionAction } from '../../app/game-session';
import type { GameSettings } from '../../domain/settings/types';
import { useUpdateState } from '../../lib/storage/update-reload-state';
import type { SettingsSection } from './SettingsDialog';

interface SettingsDialogOptions {
  dispatch: Dispatch<GameSessionAction>;
  pauseTimer: () => number;
  session: GameSession;
  setSettings: (settings: GameSettings) => Promise<boolean>;
  startTimer: () => void;
  timerRunning: boolean;
}

export const useSettingsDialog = ({
  dispatch,
  pauseTimer,
  session: { phase },
  setSettings,
  startTimer,
  timerRunning,
}: SettingsDialogOptions) => {
  const resumeTimerOnClose = useRef(false);
  const [isOpen, setIsOpen] = useUpdateState('settings-open', false);
  const [section, setSection] = useUpdateState<SettingsSection>(
    'settings-section',
    'general',
  );

  const openSection = (nextSection: SettingsSection) => {
    if (!isOpen)
      resumeTimerOnClose.current = phase === 'questions' && timerRunning;
    if (resumeTimerOnClose.current) pauseTimer();
    setSection(nextSection);
    setIsOpen(true);
  };
  const open = () => openSection('general');
  const openTraining = () => openSection('training');

  const close = () => {
    setIsOpen(false);
    if (phase === 'questions' && resumeTimerOnClose.current) startTimer();
    resumeTimerOnClose.current = false;
  };

  const save = async (nextSettings: GameSettings) => {
    if (!(await setSettings(nextSettings))) return;
    if (phase === 'questions' || phase === 'results') {
      dispatch({ settings: nextSettings, type: 'settings-updated' });
    }
    close();
  };

  return { close, open, openTraining, save, isOpen, section };
};
