export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

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
