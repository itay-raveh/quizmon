import { useState } from 'react';
import { defaultModifiers, normalizeModifiers } from './game';
import type { Modifiers } from './types';

const SETTINGS_KEY = 'quizmon.training-settings.v2';
const GENERATION_PROMPT_KEY = 'quizmon.generation-prompt.v1';

const readModifiers = (): Modifiers => {
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    return stored ? normalizeModifiers(JSON.parse(stored)) : defaultModifiers;
  } catch {
    return defaultModifiers;
  }
};

export const usePersistentModifiers = () => {
  const [modifiers, setModifiersState] = useState<Modifiers>(readModifiers);

  const setModifiers = (nextModifiers: Modifiers) => {
    const normalized = normalizeModifiers(nextModifiers);
    setModifiersState(normalized);

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    } catch {
      // The game still works when storage is unavailable.
    }
  };

  return [modifiers, setModifiers] as const;
};

export const shouldShowGenerationPrompt = (): boolean => {
  try {
    return (
      !window.localStorage.getItem(SETTINGS_KEY) &&
      !window.localStorage.getItem(GENERATION_PROMPT_KEY)
    );
  } catch {
    return true;
  }
};

export const markGenerationPromptAnswered = () => {
  try {
    window.localStorage.setItem(GENERATION_PROMPT_KEY, '1');
  } catch {
    return;
  }
};
