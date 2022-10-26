import { Checkbox } from '@mantine/core';
import startCase from 'lodash.startcase';
import type { FC } from 'react';
import { useFormContext } from './form';

interface CheckboxGroupProps {
  name: string;
  description: string;
  values: readonly string[];
}

const CheckboxGroup: FC<CheckboxGroupProps> = ({
  name,
  description,
  values,
}) => {
  const form = useFormContext();

  return (
    <Checkbox.Group
      label={startCase(name)}
      description={description}
      errorProps={{ mt: 'xs' }}
      sx={{ minHeight: '5rem' }}
      {...form.getInputProps(name)}
    >
      {values.map((value) => (
        <Checkbox key={value} value={value} label={startCase(value)} />
      ))}
    </Checkbox.Group>
  );
};

export default CheckboxGroup;
