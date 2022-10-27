import { FormValidateInput } from '@mantine/form/lib/types';
import { Modifiers } from '..';

const atLeastOne = (value: unknown[]) =>
  value.length < 1 ? 'Select at least one' : null;

export const validate: FormValidateInput<Modifiers> = {
  generations: atLeastOne,
  formCategories: atLeastOne,
};
