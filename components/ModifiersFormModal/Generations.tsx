import { generations } from 'lib/types/GenRoman';
import type { FC } from 'react';
import CheckboxGroup from './CheckboxGroup';

const Generations: FC = () => (
  <CheckboxGroup
    name='generations'
    description='You will only see Pokémon from these generations'
    values={generations}
  />
);

export default Generations;
