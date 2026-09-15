import { isRecord } from '../../../lib/validation';
import { SaveError, type SaveMigration } from '../save-schema';
import { parsePlayerDataV7 } from './player-v7';

export const playerMigrationV6: SaveMigration = {
  parse(value) {
    if (
      !isRecord(value) ||
      !isRecord(value.results) ||
      !isRecord(value.results.progress) ||
      value.results.progress.version !== 2 ||
      !isRecord(value.results.streak) ||
      value.results.streak.version !== 1 ||
      (value.profile !== null &&
        (!isRecord(value.profile) || value.profile.version !== 1))
    )
      throw new SaveError(
        'invalid',
        'The version 6 save contains invalid progress or profile data.',
      );
    // The remaining fields have the same shape in schemas 6 and 7.
    parsePlayerDataV7(value);
    return value;
  },
  upgrade: parsePlayerDataV7,
};
