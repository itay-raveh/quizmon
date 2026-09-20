import { SAVE_SCHEMA_VERSION } from '../player-save.ts';
import { isRecord } from '../../../lib/validation.ts';
import { SaveError } from '../save-schema.ts';

export const parseUpdate = (value: unknown) => {
  if (
    !isRecord(value) ||
    value.saveVersion !== SAVE_SCHEMA_VERSION ||
    typeof value.url !== 'string' ||
    !isRecord(value.values)
  )
    throw new SaveError('invalid', 'The saved app session is invalid.');
  return {
    saveVersion: SAVE_SCHEMA_VERSION,
    url: value.url,
    values: value.values,
  };
};
