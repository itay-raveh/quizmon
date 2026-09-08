export const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  isObject(value) && !Array.isArray(value);

export const isFiniteNonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const isNonnegativeInteger = (value: unknown): value is number =>
  isFiniteNonnegative(value) && Number.isInteger(value);

export const isChoice = <T extends string>(
  value: unknown,
  choices: readonly T[],
): value is T => typeof value === 'string' && choices.includes(value as T);

export const isNonemptyChoiceArray = (
  value: unknown,
  choices: readonly string[],
): boolean =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((entry) => isChoice(entry, choices));

export const isUtcTimestamp = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isDailyDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};
