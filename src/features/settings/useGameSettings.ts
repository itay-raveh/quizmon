import {
  defaultGameSettings,
  normalizeGameSettings,
} from '@/domain/settings/game-settings';
import type { GameSettings } from '@/domain/settings/types';
import { readPlayerData, updatePlayerData } from '@/lib/storage/player-storage';
import { useCallback, useState } from 'react';

export const useGameSettings = () => {
  const [settings, setSettingsState] = useState(
    () =>
      readPlayerData().settings ?? normalizeGameSettings(defaultGameSettings),
  );

  const setSettings = useCallback((nextSettings: GameSettings) => {
    const normalized = normalizeGameSettings(nextSettings);
    setSettingsState(normalized);

    updatePlayerData({ settings: normalized });
  }, []);

  return [settings, setSettings] as const;
};
