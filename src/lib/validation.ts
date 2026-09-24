export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isSafeNonnegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

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

export const utcTimestampSchema = z.iso.datetime({ precision: 3 });
export const dailyDateSchema = z.iso.date();
export const uuidSchema = z.uuidv4();

export const isUtcTimestamp = (value: unknown): value is string =>
  utcTimestampSchema.safeParse(value).success;

export const isDailyDate = (value: unknown): value is string =>
  dailyDateSchema.safeParse(value).success;

export const isUuid = (value: unknown): value is string =>
  uuidSchema.safeParse(value).success;
import { z } from 'zod';
