import { useState } from 'react';
import { readPlayerData, updatePlayerData } from './player-storage';
import { defaultModifiers, normalizeModifiers } from './game';
import type { Modifiers } from './types';

const normalizeTrainingSettings = (value: unknown): Modifiers =>
  normalizeModifiers(value);

const readModifiers = (): Modifiers =>
  normalizeTrainingSettings(readPlayerData().settings ?? defaultModifiers);

export const usePersistentModifiers = () => {
  const [modifiers, setModifiersState] = useState<Modifiers>(readModifiers);

  const setModifiers = (nextModifiers: Modifiers) => {
    const normalized = normalizeTrainingSettings(nextModifiers);
    setModifiersState(normalized);

    updatePlayerData({ settings: normalized });
  };

  return [modifiers, setModifiers] as const;
};

export const shouldShowGenerationPrompt = (): boolean => {
  const data = readPlayerData();
  return !data.settings && !data.generationPromptAnswered;
};

export const markGenerationPromptAnswered = () => {
  updatePlayerData({ generationPromptAnswered: true });
};
