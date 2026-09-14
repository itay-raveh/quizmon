import { PLAYER_SAVE_VERSION } from '@/domain/player/player-save';
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from '@/lib/storage/browser-storage';
import { getSaveIssue } from '@/lib/storage/save-health';
import { isRecord } from '@/lib/validation';
import { useLayoutEffect, useState } from 'react';

const UPDATE_STATE_KEY = 'quizmon.update-state.v1';
const stored = readStoredJson('sessionStorage', UPDATE_STATE_KEY);
const restored =
  isRecord(stored) &&
  stored.saveVersion === PLAYER_SAVE_VERSION &&
  stored.url === window.location.href &&
  isRecord(stored.values)
    ? stored.values
    : {};
if (
  isRecord(stored) &&
  stored.saveVersion === PLAYER_SAVE_VERSION &&
  typeof stored.url === 'string' &&
  isRecord(stored.values)
)
  removeStoredValue('sessionStorage', UPDATE_STATE_KEY);
const current = new Map<string, unknown>();

export const readUpdateState = <T>(key: string, fallback: T): T => {
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
    saveVersion: PLAYER_SAVE_VERSION,
    values: Object.fromEntries(current),
  });

export const reloadAfterUpdate = () => {
  if (!getSaveIssue() && !saveUpdateState()) return false;
  window.location.reload();
  return true;
};
