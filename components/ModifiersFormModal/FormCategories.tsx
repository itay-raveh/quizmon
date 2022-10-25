import { formCategories } from 'lib/types/FormCategory';
import type { FC } from 'react';
import CheckboxGroup from './CheckboxGroup';

const FormCategories: FC = () => (
  <CheckboxGroup
    name='formCategories'
    description='You will only get these forms of pokemon'
    values={formCategories}
  />
);

export default FormCategories;
