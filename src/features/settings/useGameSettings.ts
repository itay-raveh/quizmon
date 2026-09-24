import { useCallback, useEffect, useState } from 'react';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import type { GameSettings } from '../../domain/settings/types';
import {
  readPlayerData,
  subscribeToPlayerChanges,
  updatePlayerData,
} from '../../lib/storage/player-storage';

export const useGameSettings = () => {
  const [settings, setSettingsState] = useState(
    () => readPlayerData().settings ?? defaultGameSettings,
  );

  useEffect(
    () =>
      subscribeToPlayerChanges(() => {
        const next = readPlayerData().settings ?? defaultGameSettings;
        setSettingsState((current) =>
          JSON.stringify(current) === JSON.stringify(next) ? current : next,
        );
      }),
    [],
  );

  const setSettings = useCallback(async (nextSettings: GameSettings) => {
    const saved = await updatePlayerData({ settings: nextSettings });
    if (saved)
      setSettingsState(readPlayerData().settings ?? defaultGameSettings);
    return saved;
  }, []);

  return [settings, setSettings] as const;
};
