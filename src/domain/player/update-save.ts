import { isRecord } from '../../lib/validation.ts';
import { SAVE_SCHEMA_VERSION } from './player-save.ts';
import { parseVersionedSave } from './save-schema.ts';
import { parseUpdate } from './schemas/update.ts';

export const parseUpdateSave = (value: unknown) =>
  parseVersionedSave(
    { version: isRecord(value) ? value.saveVersion : undefined, data: value },
    { currentVersion: SAVE_SCHEMA_VERSION, parseCurrent: parseUpdate },
  ).data;
