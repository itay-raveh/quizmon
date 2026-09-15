import { isRecord } from '../../../lib/validation';
import { SaveError } from '../save-schema';

export const parseUpdateV7 = (value: unknown) => {
  if (
    !isRecord(value) ||
    value.saveVersion !== 7 ||
    typeof value.url !== 'string' ||
    !isRecord(value.values)
  )
    throw new SaveError('invalid', 'The saved app session is invalid.');
  return { saveVersion: 7, url: value.url, values: value.values };
};
