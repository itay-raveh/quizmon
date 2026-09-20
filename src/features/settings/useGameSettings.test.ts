import { act, renderHook } from '@testing-library/react';
import { useMemo } from 'react';
import { defaultGameSettings } from '../../domain/settings/game-settings';
import type { GameSettings } from '../../domain/settings/types';
import { useGameSettings } from './useGameSettings';

const storage = vi.hoisted(() => ({
  settings: undefined as GameSettings | undefined,
  listeners: new Set<() => void>(),
  update: vi.fn(),
}));

vi.mock('../../lib/storage/player-storage', () => ({
  readPlayerData: () => ({ settings: structuredClone(storage.settings) }),
  subscribeToPlayerChanges: (listener: () => void) => {
    storage.listeners.add(listener);
    return () => storage.listeners.delete(listener);
  },
  updatePlayerData: storage.update,
}));

beforeEach(() => {
  storage.settings = structuredClone(defaultGameSettings);
  storage.listeners.clear();
  storage.update.mockReset().mockResolvedValue(true);
});

const notify = () => {
  act(() => storage.listeners.forEach((listener) => listener()));
};

test('keeps derived training work cached when only player progress changes', () => {
  const derive = vi.fn((settings: GameSettings) => settings.generations.length);
  const { result, unmount } = renderHook(() => {
    const [settings] = useGameSettings();
    const generationCount = useMemo(() => derive(settings), [settings]);
    return { settings, generationCount };
  });
  const initial = result.current.settings;

  notify();
  notify();

  expect(result.current.settings).toBe(initial);
  expect(derive).toHaveBeenCalledTimes(1);

  storage.settings = { ...storage.settings!, generations: ['I', 'II'] };
  notify();

  expect(result.current.settings).not.toBe(initial);
  expect(result.current.generationCount).toBe(2);
  expect(derive).toHaveBeenCalledTimes(2);
  notify();
  expect(derive).toHaveBeenCalledTimes(2);

  storage.settings = { ...storage.settings, soundVolume: 0 };
  notify();
  expect(result.current.settings.soundVolume).toBe(0);
  expect(derive).toHaveBeenCalledTimes(3);
  unmount();
  expect(storage.listeners.size).toBe(0);
});

test('still normalizes and applies successfully saved settings', async () => {
  const { result } = renderHook(() => useGameSettings());
  let saved: boolean | undefined;

  await act(async () => {
    saved = await result.current[1]({
      ...result.current[0],
      soundVolume: 2,
      generations: ['I', 'II'],
    });
  });

  expect(saved).toBe(true);
  expect(storage.update).toHaveBeenCalledWith({
    settings: result.current[0],
  });
  expect(result.current[0].soundVolume).toBe(1);
  expect(result.current[0].generations).toEqual(['I', 'II']);
});

test('does not apply a failed settings save', async () => {
  storage.update.mockResolvedValue(false);
  const { result } = renderHook(() => useGameSettings());
  const initial = result.current[0];
  let saved: boolean | undefined;

  await act(async () => {
    saved = await result.current[1]({ ...initial, soundVolume: 0 });
  });

  expect(saved).toBe(false);
  expect(result.current[0]).toBe(initial);
});
