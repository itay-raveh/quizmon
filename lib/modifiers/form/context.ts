import { createFormContext } from '@mantine/form';
import type { UseFormInput } from '@mantine/form/lib/types';
import type { Modifiers } from '..';
import { useModifiers } from '../context';
import { validate } from './validate';

const [
  ModifiersFormProvider,
  useModifiersFormContext,
  useModifiersFormDirectly,
] = createFormContext<Modifiers>();

export { ModifiersFormProvider, useModifiersFormContext };

const makeUseFormInput = (
  initialValues: Modifiers
): UseFormInput<Modifiers> => ({
  initialValues,
  validate,
  validateInputOnChange: true,
});

export const useModifiersForm = () =>
  useModifiersFormDirectly(makeUseFormInput(useModifiers()));
