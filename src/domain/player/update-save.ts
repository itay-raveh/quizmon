import { isRecord } from '../../lib/validation';
import { SAVE_SCHEMA_VERSION } from './player-save';
import {
  parseVersionedSave,
  SaveError,
  type SaveMigration,
} from './save-schema';
import { updateMigrationV4 } from './schemas/update-v4';
import { parseUpdateV7 } from './schemas/update-v7';

const migrations: Readonly<Record<number, SaveMigration>> = {
  4: updateMigrationV4,
  5: { parse: (value) => value, upgrade: (value) => value },
  6: {
    parse(value) {
      if (!isRecord(value) || value.saveVersion !== 6)
        throw new SaveError('invalid', 'The version 6 app session is invalid.');
      parseUpdateV7({ ...value, saveVersion: 7 });
      return value;
    },
    upgrade: (value) => ({ ...(value as object), saveVersion: 7 }),
  },
};

export const parseUpdateSave = (value: unknown) =>
  parseVersionedSave(
    {
      version: isRecord(value)
        ? value.saveVersion === undefined
          ? 4
          : value.saveVersion
        : undefined,
      data: value,
    },
    {
      minimumVersion: 4,
      currentVersion: SAVE_SCHEMA_VERSION,
      migrations,
      parseCurrent: parseUpdateV7,
    },
  ).data;
