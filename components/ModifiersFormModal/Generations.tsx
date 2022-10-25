import { Checkbox } from '@mantine/core';
import { generations } from 'lib/types/GenRoman';
import type { FC } from 'react';
import { useFormContext } from './form';

const Generations: FC = () => {
  const form = useFormContext();

  return (
    <Checkbox.Group
      label='Generations'
      description='You will only see Pokémon from these generations'
      errorProps={{ sx: { marginTop: '0.3rem' } }}
      sx={{ minHeight: '4.5rem' }}
      {...form.getInputProps('generations')}
    >
      {generations.map((gen) => (
        <Checkbox key={gen} value={gen} label={`Gen ${gen}`} />
      ))}
    </Checkbox.Group>
  );
};

export default Generations;
