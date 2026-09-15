import {
  isRecord,
  isChoice,
  isNonemptyChoiceArray,
} from '../../../lib/validation';
import { generations } from '../../pokemon/types';
import { trainingModes } from '../../settings/types';
import { defaultGameSettings } from '../../settings/game-settings';
import { SaveError, type SaveMigration } from '../save-schema';
import { migrateRoundSubjectsV4 } from './player-v4';
import { upgradeSettingsV5 } from './player-v5';
import { parseRoundV7 } from './round-v7';

export const upgradeRoundSettingsV4 = (value: unknown): unknown => {
  if (
    !isRecord(value) ||
    !isNonemptyChoiceArray(value.generations, generations) ||
    !isChoice(value.trainingMode, trainingModes)
  )
    throw new SaveError('invalid', 'The saved round settings are invalid.');
  const settings = upgradeSettingsV5({ ...defaultGameSettings, ...value });
  if (isRecord(settings) && value.difficulty === undefined) {
    delete settings.difficulty;
    delete settings.questionSelection;
  }
  return settings;
};

const upgradeRoundV4 = (value: unknown): unknown => {
  const migrated = migrateRoundSubjectsV4(value);
  if (!isRecord(migrated)) return migrated;
  const { modifiers, settings, ...round } = migrated;
  return {
    ...round,
    settings: upgradeRoundSettingsV4(modifiers ?? settings),
    version: 3,
  };
};

export const roundMigrationV4: SaveMigration = {
  parse(value) {
    if (!isRecord(value) || value.version !== 2)
      throw new SaveError('invalid', 'The saved unfinished round is invalid.');
    const upgraded = upgradeRoundV4(value);
    if (!isRecord(upgraded) || !parseRoundV7({ ...upgraded, version: 7 }))
      throw new SaveError('invalid', 'The saved unfinished round is invalid.');
    return value;
  },
  upgrade: upgradeRoundV4,
};
