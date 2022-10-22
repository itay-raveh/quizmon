import { createFormContext } from '@mantine/form';
import type { Modifiers } from 'lib/models/Modifiers';

export const [FormProvider, useFormContext, useForm] =
  createFormContext<Modifiers>();
