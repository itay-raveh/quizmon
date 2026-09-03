import { useCallback, useState, type Dispatch } from 'react';
import type { SettingsTab } from '@/components/ModifiersDialog';
import type { Modifiers } from '@/game/types';
import type { GameSession, GameSessionAction } from './session';

interface SettingsState {
  initialTab: SettingsTab;
}

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
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const phase = session.phase;

  const open = useCallback(
    (initialTab: SettingsTab) => {
      if (phase === 'questions') pauseTimer();
      setSettings({ initialTab });
    },
    [pauseTimer, phase],
  );

  const close = useCallback(() => {
    setSettings(null);
    if (phase === 'questions') startTimer();
  }, [phase, startTimer]);

  const save = useCallback(
    (nextModifiers: Modifiers) => {
      setModifiers(nextModifiers);
      markGenerationKnown();
      if (phase === 'questions' || phase === 'results') {
        dispatch({ modifiers: nextModifiers, type: 'settings-updated' });
      }
      setSettings(null);
      if (phase === 'questions') startTimer();
    },
    [dispatch, markGenerationKnown, phase, setModifiers, startTimer],
  );

  return { close, open, save, settings };
};
