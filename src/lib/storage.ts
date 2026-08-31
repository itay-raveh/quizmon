import { useState } from 'react';
import { defaultModifiers, normalizeModifiers } from './game';
import type { Modifiers } from './types';

const STORAGE_KEY = 'modifiers';

const readModifiers = (): Modifiers => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // The game still works when storage is unavailable.
    }
  };

  return [modifiers, setModifiers] as const;
};
