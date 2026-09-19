import { useCallback, useEffect, useState } from 'react';
import {
  defaultGameSettings,
  normalizeGameSettings,
} from '../../domain/settings/game-settings';
import type { GameSettings } from '../../domain/settings/types';
import {
  readPlayerData,
  subscribeToPlayerChanges,
  updatePlayerData,
} from '../../lib/storage/player-storage';

export const useGameSettings = () => {
  const [settings, setSettingsState] = useState(
    () =>
      readPlayerData().settings ?? normalizeGameSettings(defaultGameSettings),
  );

  useEffect(
    () =>
      subscribeToPlayerChanges(() => {
        const next =
          readPlayerData().settings ??
          normalizeGameSettings(defaultGameSettings);
        setSettingsState((current) =>
          JSON.stringify(current) === JSON.stringify(next) ? current : next,
        );
      }),
    [],
  );

  const setSettings = useCallback(async (nextSettings: GameSettings) => {
    const normalized = normalizeGameSettings(nextSettings);
    const saved = await updatePlayerData({ settings: normalized });
    if (saved) setSettingsState(normalized);
    return saved;
  }, []);

  return [settings, setSettings] as const;
};
