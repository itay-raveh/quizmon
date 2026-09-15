import { isRecord } from '../../../lib/validation';
import { SaveError, type SaveMigration } from '../save-schema';
import { migrateRoundSubjectsV4 } from './player-v4';
import { upgradeRoundSettingsV4 } from './round-v4';
import { isSavedResult } from './player-v7';
import { parseUpdateV7 } from './update-v7';

const migrateResult = (value: unknown): unknown => {
  if (value === undefined || value === null) return value;
  const migrated = migrateRoundSubjectsV4(value);
  if (!isSavedResult(migrated))
    throw new SaveError('invalid', 'The saved session result is invalid.');
  return migrated;
};

const upgradeUpdateV4 = (value: unknown): unknown => {
  const saved = parseUpdateV7({ ...(value as object), saveVersion: 7 });
  const original = saved.values.session;
  const migrated = migrateRoundSubjectsV4(original);
  if (original !== undefined && !isRecord(migrated))
    throw new SaveError('invalid', 'The saved game session is invalid.');
  if (!isRecord(migrated)) return { ...saved, saveVersion: 6 };
  const { modifiers, settings, ...session } = migrated;
  const hasSettings = modifiers !== undefined || settings !== undefined;
  if (!hasSettings && session.phase !== 'landing')
    throw new SaveError('invalid', 'The saved game session has no settings.');
  return {
    ...saved,
    saveVersion: 6,
    values: {
      ...saved.values,
      session: {
        ...session,
        ...(hasSettings
          ? { settings: upgradeRoundSettingsV4(modifiers ?? settings) }
          : {}),
        ...('result' in session
          ? { result: migrateResult(session.result) }
          : {}),
        ...('bestResult' in session
          ? { bestResult: migrateResult(session.bestResult) }
          : {}),
        ...(isRecord(session.leagueRecord)
          ? {
              leagueRecord: {
                ...session.leagueRecord,
                result: migrateResult(session.leagueRecord.result),
              },
            }
          : {}),
      },
    },
  };
};

export const updateMigrationV4: SaveMigration = {
  parse(value) {
    if (!isRecord(value) || value.saveVersion !== undefined)
      throw new SaveError('invalid', 'The saved app session is invalid.');
    upgradeUpdateV4(value);
    return value;
  },
  upgrade: upgradeUpdateV4,
};
