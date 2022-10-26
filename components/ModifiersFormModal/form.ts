import { createFormContext } from '@mantine/form';
import type { UseFormInput } from '@mantine/form/lib/types';
import type { Modifiers } from 'lib/models/Modifiers';

export const [FormProvider, useFormContext, useForm] =
  createFormContext<Modifiers>();

const atLeastOne = (value: unknown[]) =>
  value.length < 1 ? 'Select at least one' : null;

export const useFormInput: UseFormInput<Modifiers> = {
  initialValues: {
    generations: ['I'],
    formCategories: ['default'],
    isLimitActive: true,
    limit: 10,
  },
  validate: {
    generations: atLeastOne,
    formCategories: atLeastOne,
  },
  validateInputOnChange: true,
};
