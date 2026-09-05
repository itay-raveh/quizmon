export type BrowserStorage = 'localStorage' | 'sessionStorage';

export const readStoredValue = (
  storage: BrowserStorage,
  key: string,
): string | null => {
  try {
    return window[storage].getItem(key);
  } catch {
    return null;
  }
};

export const readStoredJson = (
  storage: BrowserStorage,
  key: string,
): unknown => {
  const value = readStoredValue(storage, key);
  if (value === null) return null;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

export const writeStoredValue = (
  storage: BrowserStorage,
  key: string,
  value: string,
): boolean => {
  try {
    window[storage].setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const writeStoredJson = (
  storage: BrowserStorage,
  key: string,
  value: unknown,
): boolean => {
  try {
    return writeStoredValue(storage, key, JSON.stringify(value));
  } catch {
    return false;
  }
};

export const removeStoredValue = (
  storage: BrowserStorage,
  key: string,
): boolean => {
  try {
    window[storage].removeItem(key);
    return true;
  } catch {
    return false;
  }
};
