import { Checkbox, NumberInput } from '@mantine/core';
import type { FC } from 'react';
import { useFormContext } from './form';

const Limit: FC = () => {
  const form = useFormContext();

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
