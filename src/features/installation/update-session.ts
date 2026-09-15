import { SAVE_SCHEMA_VERSION } from '@/domain/player/player-save';
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from '@/lib/storage/browser-storage';
import { getSaveIssue, reportSaveIssue } from '@/lib/storage/save-health';
import { parseUpdateSave } from '@/domain/player/update-save';
import { useLayoutEffect, useState } from 'react';

const UPDATE_STATE_KEY = 'quizmon.update-state.v1';
const stored = readStoredJson('sessionStorage', UPDATE_STATE_KEY);
let pendingConsumption = false;
const loadUpdateState = () => {
  if (stored === null) return {};
  try {
    const saved = parseUpdateSave(stored);
    pendingConsumption = true;
    return saved.url === window.location.href ? saved.values : {};
  } catch (error) {
    reportSaveIssue(error);
    return {};
  }
};
const restored = loadUpdateState();
const current = new Map<string, unknown>();

export const readUpdateState = <T>(key: string, fallback: T): T => {
  if (getSaveIssue()) return fallback;
  if (pendingConsumption) {
    removeStoredValue('sessionStorage', UPDATE_STATE_KEY);
    pendingConsumption = false;
  }
  return (Object.hasOwn(restored, key) ? restored[key] : fallback) as T;
};

export const useUpdateSnapshot = (key: string, value: unknown) => {
  useLayoutEffect(() => {
    delete restored[key];
    current.set(key, value);
    return () => {
      current.delete(key);
    };
  }, [key, value]);
};

export const useUpdateState = <T>(key: string, initial: T) => {
  const state = useState<T>(() => readUpdateState(key, initial));
  useUpdateSnapshot(key, state[0]);
  return state;
};

export const saveUpdateState = () =>
  !getSaveIssue() &&
  writeStoredJson('sessionStorage', UPDATE_STATE_KEY, {
    url: window.location.href,
    saveVersion: SAVE_SCHEMA_VERSION,
    values: Object.fromEntries(current),
  });

export const reloadAfterUpdate = () => {
  if (!getSaveIssue() && !saveUpdateState()) return false;
  window.location.reload();
  return true;
};
