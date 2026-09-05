import { useState } from 'react';
import {
  readStoredJson,
  readStoredValue,
  writeStoredJson,
  writeStoredValue,
} from './browser-storage';
import { defaultModifiers, normalizeModifiers } from './game';
import type { Modifiers } from './types';

const SETTINGS_KEY = 'quizmon.training-settings.v2';
const GENERATION_PROMPT_KEY = 'quizmon.generation-prompt.v1';

const normalizeTrainingSettings = (value: unknown): Modifiers => ({
  ...normalizeModifiers(value),
  limit: 10,
});

const readModifiers = (): Modifiers =>
  normalizeTrainingSettings(
    readStoredJson('localStorage', SETTINGS_KEY) ?? defaultModifiers,
  );

export const usePersistentModifiers = () => {
  const [modifiers, setModifiersState] = useState<Modifiers>(readModifiers);

  const setModifiers = (nextModifiers: Modifiers) => {
    const normalized = normalizeTrainingSettings(nextModifiers);
    setModifiersState(normalized);

    writeStoredJson('localStorage', SETTINGS_KEY, normalized);
  };

  return [modifiers, setModifiers] as const;
};

export const shouldShowGenerationPrompt = (): boolean =>
  !readStoredValue('localStorage', SETTINGS_KEY) &&
  !readStoredValue('localStorage', GENERATION_PROMPT_KEY);

export const markGenerationPromptAnswered = () => {
  writeStoredValue('localStorage', GENERATION_PROMPT_KEY, '1');
};
