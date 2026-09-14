import { isRecord } from '../../lib/validation';

export type SaveErrorKind = 'unsupported' | 'newer' | 'invalid' | 'unavailable';

export class SaveError extends Error {
  constructor(
    public readonly kind: SaveErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'SaveError';
  }
}

export interface SaveMigration {
  parse: (data: unknown) => unknown;
  upgrade: (data: unknown) => unknown;
}

interface SaveSchema<T> {
  minimumVersion: number;
  currentVersion: number;
  migrations: Readonly<Record<number, SaveMigration>>;
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
  let version = Number(value.version);
  if (version < schema.minimumVersion)
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
    let data: unknown = structuredClone(value.data);
    while (version < schema.currentVersion) {
      const migration = schema.migrations[version];
      if (!migration)
        throw new SaveError(
          'unsupported',
          'This save has no supported upgrade path.',
        );
      data = migration.upgrade(migration.parse(data));
      version += 1;
    }
    return { data: schema.parseCurrent(data), version };
  } catch (error) {
    if (error instanceof SaveError) throw error;
    throw new SaveError(
      'invalid',
      'This save contains invalid progress or settings.',
    );
  }
};
