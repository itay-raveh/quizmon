import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { emptyPlayerData } from '@/domain/player/player-save';
import { defaultGameSettings } from '@/domain/settings/game-settings';
import type { GameSettings } from '@/domain/settings/types';
import { parsePlayerData } from '@/domain/player/schemas/player-data';
import { readPlayerData } from '@/lib/storage/player-storage';
import { useGameSettings } from './useGameSettings';

vi.mock('@/lib/storage/player-storage', () => ({
  readPlayerData: vi.fn(),
  subscribeToPlayerChanges: vi.fn(),
  updatePlayerData: vi.fn(),
}));

const readInitialSettings = () => {
  let settings: GameSettings | undefined;
  const SettingsProbe = () => {
    [settings] = useGameSettings();
    return null;
  };
  renderToStaticMarkup(<SettingsProbe />);
  return settings;
};

it('uses defaults for missing preferences without awarding progress', () => {
  const fresh = emptyPlayerData();
  const original = structuredClone(fresh);
  vi.mocked(readPlayerData).mockReturnValue(fresh);
  expect(readInitialSettings()).toEqual(defaultGameSettings);
  expect(fresh).toEqual(original);
});

it('keeps saved custom selections and progress instead of replacing them with defaults', () => {
  const saved = parsePlayerData({
    ...emptyPlayerData(),
    settings: {
      ...defaultGameSettings,
      level: 1,
      questionSelection: 'custom',
      questionTypes: ['pokemonTypes'],
    },
  });
  const original = structuredClone(saved);
  vi.mocked(readPlayerData).mockReturnValue(saved);
  expect(readInitialSettings()).toEqual(saved.settings);
  expect(saved).toEqual(original);
});
