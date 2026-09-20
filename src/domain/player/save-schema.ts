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
  migrations?: Partial<Record<number, (data: unknown) => unknown>>;
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
  if (version > schema.currentVersion)
    throw new SaveError(
      'newer',
      'This save was created by a newer version of Quizmon.',
    );
  try {
    let data: unknown = structuredClone(value.data);
    for (let from = version; from < schema.currentVersion; from++) {
      const migrate = schema.migrations?.[from];
      if (!migrate)
        throw new SaveError(
          'unsupported',
          'This save uses a retired Quizmon format.',
        );
      data = migrate(data);
    }
    return { data: schema.parseCurrent(data), version: schema.currentVersion };
  } catch (error) {
    if (error instanceof SaveError) throw error;
    throw new SaveError(
      'invalid',
      'This save contains invalid progress or settings.',
    );
  }
};
