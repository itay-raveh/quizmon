import { NumberInput } from '@mantine/core';
import { useModifiersFormContext } from 'lib/modifiers/form/context';
import type { FC } from 'react';
import Checkbox from './Checkbox';

const Limit: FC = () => {
  const form = useModifiersFormContext();

  return (
    <NumberInput
      label='Limit'
      description='Maximum number of questions'
      disabled={!form.values.isLimitActive}
      min={0}
      rightSection={
        <Checkbox
          {...form.getInputProps('isLimitActive', { type: 'checkbox' })}
          mr='xl'
        />
      }
      {...form.getInputProps('limit')}
    />
  );
};

export default Limit;
