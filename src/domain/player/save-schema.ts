import { isRecord } from '../../lib/validation.ts';

export type SaveErrorKind = 'unsupported' | 'newer' | 'invalid' | 'unavailable';

export class SaveError extends Error {
  readonly kind: SaveErrorKind;
  constructor(kind: SaveErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'SaveError';
  }
}

interface SaveSchema<T> {
  currentVersion: number;
  parseCurrent: (data: unknown) => T;
}

export const parseVersionedSave = <T>(
  value: unknown,
  schema: SaveSchema<T>,
): { data: T; version: number } => {
  if (
    !isRecord(value) ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 1
  )
    throw new SaveError('invalid', 'The save has an invalid version.');
  const version = Number(value.version);
  if (version < schema.currentVersion)
    throw new SaveError(
      'unsupported',
      'This save uses a retired Quizmon format.',
    );
  if (version > schema.currentVersion)
    throw new SaveError(
      'newer',
      'This save was created by a newer version of Quizmon.',
    );
  try {
    return { data: schema.parseCurrent(structuredClone(value.data)), version };
  } catch (error) {
    if (error instanceof SaveError) throw error;
    throw new SaveError(
      'invalid',
      'This save contains invalid progress or settings.',
    );
  }
};
