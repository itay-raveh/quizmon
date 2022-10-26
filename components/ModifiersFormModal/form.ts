import { createFormContext } from '@mantine/form';
import type { UseFormInput } from '@mantine/form/lib/types';
import type { Modifiers } from 'lib/models/Modifiers';

export const [FormProvider, useFormContext, useForm] =
  createFormContext<Modifiers>();

const atLeastOne = (value: unknown[]) =>
  value.length < 1 ? 'Select at least one' : null;

type MakeUseFormInput = (initialValues: Modifiers) => UseFormInput<Modifiers>;

export const makeUseFormInput: MakeUseFormInput = (initialValues) => ({
  initialValues: initialValues,
  validate: {
    generations: atLeastOne,
    formCategories: atLeastOne,
  },
  validateInputOnChange: true,
});
