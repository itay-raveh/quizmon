import { Checkbox as MantineCheckbox } from '@mantine/core';
import { useModifiersFormContext } from 'lib/modifiers/form/context';
import startCase from 'lodash.startcase';
import type { FC } from 'react';
import Checkbox from './Checkbox';

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
  const form = useModifiersFormContext();

  return (
    <MantineCheckbox.Group
      label={startCase(name)}
      description={description}
      sx={{ minHeight: '5rem' }}
      {...form.getInputProps(name)}
    >
      {values.map((value) => (
        <Checkbox key={value} value={value} label={startCase(value)} />
      ))}
    </MantineCheckbox.Group>
  );
};

export default CheckboxGroup;
