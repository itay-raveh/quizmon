import { createFormContext } from '@mantine/form';
import type { UseFormInput } from '@mantine/form/lib/types';
import { useContext } from 'react';
import { ModifiersContext } from './context/ModifiersContext';
import type { Modifiers } from './models/Modifiers';

const [
  ModifiersFormProvider,
  useModifiersFormContext,
  useModifiersFormDirectly,
] = createFormContext<Modifiers>();

export { ModifiersFormProvider, useModifiersFormContext };

const atLeastOne = (value: unknown[]) =>
  value.length < 1 ? 'Select at least one' : null;

type MakeUseFormInput = (initialValues: Modifiers) => UseFormInput<Modifiers>;

const makeUseFormInput: MakeUseFormInput = (initialValues) => ({
  initialValues: initialValues,
  validate: {
    generations: atLeastOne,
    formCategories: atLeastOne,
  },
  validateInputOnChange: true,
});

export const useModifiersForm = () =>
  useModifiersFormDirectly(makeUseFormInput(useContext(ModifiersContext)));
