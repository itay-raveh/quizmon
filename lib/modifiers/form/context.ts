import { createFormContext } from '@mantine/form';
import type { UseFormInput } from '@mantine/form/lib/types';
import type { Modifiers } from '..';
import { validate } from './validate';

export const [
  ModifiersFormProvider,
  useModifiersFormContext,
  useModifiersForm,
] = createFormContext<Modifiers>();

export const makeUseFormInput = (
  initialValues: Modifiers
): UseFormInput<Modifiers> => ({
  initialValues,
  validate,
  validateInputOnChange: true,
});
