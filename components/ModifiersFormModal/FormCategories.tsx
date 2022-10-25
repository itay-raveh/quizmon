import { Checkbox } from '@mantine/core';
import { formCategories } from 'lib/types/FormCategory';
import startCase from 'lodash.startcase';
import type { FC } from 'react';
import { useFormContext } from './form';

const FormCategories: FC = () => {
  const form = useFormContext();

  return (
    <Checkbox.Group
      label='Form Categories'
      description='You will only get these forms of pokemon'
      errorProps={{ sx: { marginTop: '0.3rem' } }}
      sx={{ minHeight: '4.5rem' }}
      {...form.getInputProps('formCategories')}
    >
      {formCategories.map((category) => (
        <Checkbox key={category} value={category} label={startCase(category)} />
      ))}
    </Checkbox.Group>
  );
};

export default FormCategories;
