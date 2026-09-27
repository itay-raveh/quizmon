import { isRecord } from '../../../lib/validation.ts';
import { SaveError } from '../save-schema.ts';

export const parseUpdate = (value: unknown) => {
  if (
    !isRecord(value) ||
    typeof value.url !== 'string' ||
    !isRecord(value.values)
  )
    throw new SaveError('invalid', 'The saved app session is invalid.');
  return {
    url: value.url,
    values: value.values,
  };
};
