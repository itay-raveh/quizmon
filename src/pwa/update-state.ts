import { useLayoutEffect, useState } from 'react';
import {
  readStoredJson,
  removeStoredValue,
  writeStoredJson,
} from '@/game/browser-storage';
import { isRecord } from '@/game/validation';

const UPDATE_STATE_KEY = 'quizmon.update-state.v1';
const stored = readStoredJson('sessionStorage', UPDATE_STATE_KEY);
removeStoredValue('sessionStorage', UPDATE_STATE_KEY);
const restored =
  isRecord(stored) &&
  stored.url === window.location.href &&
  isRecord(stored.values)
    ? stored.values
    : {};
const current = new Map<string, unknown>();

export const readUpdateState = <T>(key: string, fallback: T): T =>
  Object.hasOwn(restored, key) ? (restored[key] as T) : fallback;

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
  writeStoredJson('sessionStorage', UPDATE_STATE_KEY, {
    url: window.location.href,
    values: Object.fromEntries(current),
  });

export const reloadAfterUpdate = () => {
  if (!saveUpdateState()) return false;
  window.location.reload();
  return true;
};
